import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import * as crypto from 'crypto';
import { GameRoom, Player } from '../game.types';
import { ScoringService } from './scoring.service';
import { RedisService } from '../../redis/redis.service';
import { GeoLocation, COUNTRY_TIER_WEIGHTS, isRoadLocation } from '../../geo-database/geo-database.service';
import { RoomStoreService } from './room-store.service';
import { TimerService } from './timer.service';
import { toPublicPlayerId } from '../factories/lobby.factory';

@Injectable()
export class RoundCoordinatorService {
  private readonly logger = new Logger(RoundCoordinatorService.name);

  constructor(
    private readonly scoring: ScoringService,
    private readonly redis: RedisService,
    private readonly roomStore: RoomStoreService,
    private readonly timerService: TimerService,
  ) {}

  private extractSubRegionKey(loc: GeoLocation): string {
    const label = loc.label || '';
    if (label.startsWith('Road in ')) {
      return label.slice(8).trim();
    }
    const parts = label.split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return label || loc.country;
  }

  private pickWeightedCountry(countries: string[]): string {
    const weights = countries.map((c) => COUNTRY_TIER_WEIGHTS[c] ?? 1.5);
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < countries.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return countries[i];
    }
    return countries[countries.length - 1];
  }

  private pickFromCountryStratified(candidates: GeoLocation[]): GeoLocation {
    const bySubRegion = new Map<string, GeoLocation[]>();
    for (const loc of candidates) {
      const sub = this.extractSubRegionKey(loc);
      let list = bySubRegion.get(sub);
      if (!list) {
        list = [];
        bySubRegion.set(sub, list);
      }
      list.push(loc);
    }
    const subKeys = Array.from(bySubRegion.keys());
    const chosenSub = subKeys[Math.floor(Math.random() * subKeys.length)];
    const bucket = bySubRegion.get(chosenSub)!;
    return bucket[Math.floor(Math.random() * bucket.length)];
  }

  selectDiverseLocations(
    pool: GeoLocation[],
    count: number,
    recentKeys?: Set<string>,
    options?: { region?: string; difficulty?: string },
  ): GeoLocation[] {
    if (!pool || pool.length === 0 || count <= 0) return [];

    const locKey = (l: GeoLocation) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}`;

    // Filter out recently seen locations
    const freshPool =
      recentKeys && recentKeys.size > 0
        ? pool.filter((l) => !recentKeys.has(locKey(l)))
        : pool;
    const candidatePool = freshPool.length >= count ? freshPool : pool;

    // Shuffle the pool (SQL ORDER BY RANDOM() helps but JS shuffle adds extra entropy)
    const shuffled = [...candidatePool].sort(() => Math.random() - 0.5);

    // Pick greedily: avoid same country back-to-back, prefer road locations
    const selected: GeoLocation[] = [];
    const usedCountries = new Set<string>();
    const usedKeys = new Set<string>();

    // First pass: one per country
    for (const loc of shuffled) {
      if (selected.length >= count) break;
      const key = locKey(loc);
      if (usedKeys.has(key)) continue;
      if (usedCountries.has(loc.country)) continue;
      if (!isRoadLocation(loc)) continue;
      selected.push(loc);
      usedKeys.add(key);
      usedCountries.add(loc.country);
    }

    // Second pass: fill remaining slots with any road location not yet picked
    if (selected.length < count) {
      for (const loc of shuffled) {
        if (selected.length >= count) break;
        const key = locKey(loc);
        if (usedKeys.has(key)) continue;
        if (!isRoadLocation(loc)) continue;
        selected.push(loc);
        usedKeys.add(key);
      }
    }

    // Third pass: fill with anything if still short
    if (selected.length < count) {
      for (const loc of shuffled) {
        if (selected.length >= count) break;
        const key = locKey(loc);
        if (usedKeys.has(key)) continue;
        selected.push(loc);
        usedKeys.add(key);
      }
    }

    // Track selected as recently seen
    if (recentKeys) {
      for (const loc of selected) {
        recentKeys.add(locKey(loc));
      }
    }

    return selected;
  }

  async startRound(roundNumber: number, server: Server, room: GameRoom) {
    this.timerService.clearCountdown(room);
    room.status = 'ROUND_ACTIVE';
    room.currentRound = roundNumber;
    room.roundTarget = room.selectedLocations[roundNumber - 1] || null;
    room.roundUplinkToken = crypto.randomBytes(16).toString('hex');
    room.roadToken = `road_${crypto.randomBytes(12).toString('hex')}`;
    room.currentSharedImage = null;
    room.sharedImageTimestamp = null;
    room.sharedImageCaption = '';

    if (room.roundTarget) {
      await this.redis.setRoundTarget(
        room.id,
        room.roundUplinkToken,
        { lat: room.roundTarget.lat, lng: room.roundTarget.lng },
      );
    }

    for (const p of Object.values(room.players)) {
      p.currentPin = null;
      p.lockedGuess = null;
      p.hasGuessed = false;
      p.lastRoundScore = 0;
      p.lastRoundDistanceKm = null;
    }

    const activePlayers = Object.values(room.players).filter((p) => p.connected && p.inGame !== false);
    const players = activePlayers.map((p) => ({
      id: p.publicId || toPublicPlayerId(p.id),
      username: p.username,
      totalScore: p.totalScore || 0,
      hasGuessed: false,
      isHost: (room.hostId && p.id === room.hostId) || (room.hostSocketId && p.socketId === room.hostSocketId),
      connected: p.connected,
    }));

    const payload = {
      roomId: room.id,
      round: roundNumber,
      totalRounds: room.totalRounds,
      difficulty: room.roundTarget?.difficulty || room.difficulty,
      uplinkToken: room.roundUplinkToken,
      roadToken: room.roadToken || null,
      sharedImage: null,
      guessedCount: 0,
      totalPlayers: activePlayers.length,
      players,
    };

    server.to(room.id).emit('round_started', payload);
    server.emit('lobbies_list', this.roomStore.getLobbiesList());

    // B5: Ensure a round where nobody guesses still ends automatically after 180s
    this.timerService.startMaxRoundTimer(room, 180, () => {
      this.endRound(server, room);
    });
  }

  endRound(server: Server, room: GameRoom) {
    // B6: Guard against duplicate execution (idempotency)
    if (room.status !== 'ROUND_ACTIVE' && room.status !== 'ROUND_COUNTDOWN') {
      return;
    }
    const target = room.roundTarget;
    if (!target) return;

    this.timerService.clearCountdown(room);
    room.status = 'ROUND_RESULTS';

    for (const player of Object.values(room.players)) {
      const finalCoords = player.lockedGuess || player.currentPin || null;
      if (finalCoords) {
        const dist = this.scoring.calculateDistanceKm(
          target.lat,
          target.lng,
          finalCoords.lat,
          finalCoords.lng,
        );
        const score = this.scoring.calculateScore(dist);
        player.lastRoundDistanceKm = Math.round(dist * 10) / 10;
        player.lastRoundScore = score;
        player.lockedGuess = finalCoords;
      } else {
        player.lastRoundDistanceKm = null;
        player.lastRoundScore = 0;
      }
      player.totalScore = (player.totalScore || 0) + player.lastRoundScore;
    }

    const activePlayers = Object.values(room.players).filter((p) => p.connected && p.inGame !== false);
    const results = activePlayers.map((p) => ({
      id: p.publicId || toPublicPlayerId(p.id),
      username: p.username,
      guess: p.lockedGuess,
      distanceKm: p.lastRoundDistanceKm,
      roundScore: p.lastRoundScore,
      totalScore: p.totalScore,
      isHost: (room.hostId && p.id === room.hostId) || (room.hostSocketId && p.socketId === room.hostSocketId),
    }));

    const guessersWithDist = activePlayers
      .filter((p) => p.lastRoundDistanceKm !== null)
      .sort((a, b) => a.lastRoundDistanceKm! - b.lastRoundDistanceKm!);

    const closestPlayer = guessersWithDist.length > 0 ? guessersWithDist[0] : null;

    const targetData = {
      lat: target.lat,
      lng: target.lng,
      label: target.label,
      country: target.country,
      region: target.region,
    };

    const payload = {
      roomId: room.id,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      target: targetData,
      results,
      leaderboard: [...results].sort((a, b) => b.totalScore - a.totalScore),
      closestPlayer: closestPlayer
        ? {
            username: closestPlayer.username,
            distanceKm: closestPlayer.lastRoundDistanceKm,
            score: closestPlayer.lastRoundScore,
            guess: closestPlayer.lockedGuess,
          }
        : null,
    };

    room.lastRoundResults = payload;
    server.to(room.id).emit('round_results', payload);
    server.emit('lobbies_list', this.roomStore.getLobbiesList());
  }
}
