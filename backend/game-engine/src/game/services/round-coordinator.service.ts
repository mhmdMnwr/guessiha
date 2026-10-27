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
    const weights = countries.map((c) => COUNTRY_TIER_WEIGHTS[c] ?? 1.2);
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
    const freshPool =
      recentKeys && recentKeys.size > 0
        ? pool.filter((l) => !recentKeys.has(locKey(l)) && (!l.id || !recentKeys.has(String(l.id))))
        : pool;
    const candidatePool = freshPool.length >= count ? freshPool : pool;

    // Group candidate pool by country
    const byCountry = new Map<string, GeoLocation[]>();
    const countryRegion = new Map<string, string>();
    for (const loc of candidatePool) {
      const country = loc.country || 'Unknown';
      let list = byCountry.get(country);
      if (!list) {
        list = [];
        byCountry.set(country, list);
        countryRegion.set(country, (loc.region || 'europe').toLowerCase());
      }
      list.push(loc);
    }

    const availableRegions = Array.from(new Set(countryRegion.values()));
    // Shuffle continents for worldwide rotation
    const continentOrder = [...availableRegions].sort(() => Math.random() - 0.5);
    const difficultyCycle = ['easy', 'easy', 'medium', 'medium', 'hard'];
    const isMixedDifficulty = !options?.difficulty || options.difficulty === 'all';

    const selected: GeoLocation[] = [];
    const selectedSet = new Set<GeoLocation>();
    const usedCountries = new Set<string>();

    // Non-road cap: user strictly requested non-road 360 images appear only ~1 in 1000 times (0.1% chance)
    // 99.9% of matches will have 0 non-roads (100% pure verified road gameplay)
    const allowNonRoad = Math.random() < 0.001;
    const effectiveMaxNonRoads = allowNonRoad ? 1 : 0;
    let nonRoadCount = 0;

    for (let i = 0; i < count; i++) {
      const targetContinent = continentOrder[i % continentOrder.length];
      const targetDiff = isMixedDifficulty
        ? difficultyCycle[i % difficultyCycle.length]
        : options!.difficulty!.toLowerCase();

      const allUnusedCountries = Array.from(byCountry.keys()).filter(
        (c) => !usedCountries.has(c),
      );
      const baseCountries =
        allUnusedCountries.length > 0 ? allUnusedCountries : Array.from(byCountry.keys());
      const needRoad = nonRoadCount >= effectiveMaxNonRoads;

      // 1. Try matching both targetContinent & targetDiff (preferring roads if quota reached)
      let eligibleCountries = baseCountries.filter((c) => {
        if (availableRegions.length > 1 && countryRegion.get(c) !== targetContinent) {
          return false;
        }
        const locs = byCountry.get(c)!;
        return locs.some(
          (l) => !selectedSet.has(l) && (!isMixedDifficulty || l.difficulty === targetDiff) && (!needRoad || isRoadLocation(l)),
        );
      });

      // 2. Fallback: match targetContinent with any difficulty (preferring roads if quota reached)
      if (eligibleCountries.length === 0 && availableRegions.length > 1) {
        eligibleCountries = baseCountries.filter(
          (c) =>
            countryRegion.get(c) === targetContinent &&
            byCountry.get(c)!.some((l) => !selectedSet.has(l) && (!needRoad || isRoadLocation(l))),
        );
      }

      // 3. Fallback: match any unused country with targetDiff (preferring roads if quota reached)
      if (eligibleCountries.length === 0 && isMixedDifficulty) {
        eligibleCountries = baseCountries.filter((c) =>
          byCountry.get(c)!.some((l) => !selectedSet.has(l) && l.difficulty === targetDiff && (!needRoad || isRoadLocation(l))),
        );
      }

      // 4. Fallback: any country with unselected locations (preferring roads if quota reached)
      if (eligibleCountries.length === 0) {
        eligibleCountries = baseCountries.filter((c) =>
          byCountry.get(c)!.some((l) => !selectedSet.has(l) && (!needRoad || isRoadLocation(l))),
        );
      }

      // 5. Ultimate fallback if all roads exhausted: any country with unselected locations
      if (eligibleCountries.length === 0) {
        eligibleCountries = baseCountries.filter((c) =>
          byCountry.get(c)!.some((l) => !selectedSet.has(l)),
        );
      }

      if (eligibleCountries.length === 0) break;

      const chosenCountry = this.pickWeightedCountry(eligibleCountries);
      usedCountries.add(chosenCountry);

      const countryLocs = byCountry.get(chosenCountry)!.filter((l) => !selectedSet.has(l));
      const diffMatchedLocs = isMixedDifficulty
        ? countryLocs.filter((l) => l.difficulty === targetDiff)
        : countryLocs;
      const finalCountryCandidates =
        diffMatchedLocs.length > 0 ? diffMatchedLocs : countryLocs;

      const roadCandidates = finalCountryCandidates.filter(isRoadLocation);
      const nonRoadCandidates = finalCountryCandidates.filter((l) => !isRoadLocation(l));

      let poolToPick: GeoLocation[];
      if (nonRoadCount >= effectiveMaxNonRoads) {
        poolToPick = roadCandidates.length > 0 ? roadCandidates : finalCountryCandidates;
      } else {
        // Still within allowance, but non-roads only appear with a 1-in-1000 chance
        if (Math.random() < 0.001 && nonRoadCandidates.length > 0) {
          poolToPick = nonRoadCandidates;
        } else {
          poolToPick = roadCandidates.length > 0 ? roadCandidates : finalCountryCandidates;
        }
      }

      const chosenLoc = this.pickFromCountryStratified(poolToPick);
      if (!isRoadLocation(chosenLoc)) {
        nonRoadCount++;
      }
      selected.push(chosenLoc);
      selectedSet.add(chosenLoc);
    }

    if (recentKeys) {
      for (const loc of selected) {
        recentKeys.add(locKey(loc));
        if (loc.id) recentKeys.add(String(loc.id));
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
