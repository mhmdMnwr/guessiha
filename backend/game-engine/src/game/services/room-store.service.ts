import { Injectable, Logger } from '@nestjs/common';
import { GameRoom, Player } from '../game.types';
import { toPublicPlayerId } from '../factories/lobby.factory';

@Injectable()
export class RoomStoreService {
  private readonly logger = new Logger(RoomStoreService.name);
  public customRooms: Map<string, GameRoom> = new Map();

  getRoom(roomId?: string): GameRoom | null {
    if (!roomId) return null;
    const clean = String(roomId).trim();
    if (!clean) return null;
    const direct = this.customRooms.get(clean);
    if (direct) return direct;
    for (const r of this.customRooms.values()) {
      if (r.code === clean || r.id === clean) return r;
    }
    return null;
  }

  /** Returns the custom room this clientId is currently hosting, or null. */
  findRoomHostedBy(clientId: string): GameRoom | null {
    for (const room of this.customRooms.values()) {
      if (room.hostId === clientId) return room;
    }
    return null;
  }

  findRoomByPlayer(identifier: string): GameRoom | null {
    if (!identifier) return null;
    for (const r of this.customRooms.values()) {
      if (
        r.players[identifier] ||
        Object.values(r.players).some(
          (p) => p && (p.id === identifier || p.socketId === identifier),
        )
      ) {
        return r;
      }
    }
    return null;
  }

  ensureActiveHost(room: GameRoom): string | null {
    if (!room) return null;
    const targetRoom = room;
    const connected = Object.values(targetRoom.players).filter((p) => p && p.connected === true);
    const inGrace = Object.values(targetRoom.players).filter(
      (p) => p && p.connected === false && p.lastDisconnectedAt && Date.now() - p.lastDisconnectedAt < 30000,
    );

    if (connected.length === 0 && inGrace.length === 0) {
      targetRoom.hostSocketId = null;
      targetRoom.hostId = null;
      targetRoom.hostName = null;
      return null;
    }

    const currentHost = targetRoom.hostId ? targetRoom.players[targetRoom.hostId] : null;

    const isHostValid =
      currentHost &&
      (currentHost.connected === true ||
        (connected.length === 0 &&
          currentHost.lastDisconnectedAt &&
          Date.now() - currentHost.lastDisconnectedAt < 30000));

    if (!isHostValid) {
      const candidate = connected[0] || inGrace[0];
      if (candidate) {
        targetRoom.hostSocketId = candidate.socketId;
        targetRoom.hostId = candidate.id;
        targetRoom.hostName = candidate.username;
      }
    }
    return targetRoom.hostId;
  }

  getLobbyPlayers(room: GameRoom) {
    if (!room) return [];
    this.ensureActiveHost(room);
    return Object.values(room.players)
      .filter((p) => p && (p.connected === true || (p.lastDisconnectedAt && Date.now() - p.lastDisconnectedAt < 30000)))
      .map((p) => {
        const isHost =
          (room.hostId && p.id === room.hostId) ||
          (room.hostSocketId && p.socketId === room.hostSocketId);
        return {
          id: p.publicId || toPublicPlayerId(p.id),
          username: p.username,
          connected: p.connected,
          totalScore: p.totalScore,
          isHost: Boolean(isHost),
        };
      });
  }

  formatRoomSummary(r: GameRoom, playerCount: number) {
    return {
      id: r.id,
      code: r.code || r.id,
      isPrivate: Boolean(r.isPrivate),
      name: r.name,
      hostName: r.hostName || 'HOST',
      playerCount,
      maxPlayers: r.maxPlayers || 8,
      selectedRegion: r.selectedRegion || 'all',
      difficulty: r.difficulty || 'all',
      totalRounds: r.totalRounds || 5,
      currentRound: r.currentRound || 0,
      status: r.status,
    };
  }

  findRoomSummaryByCode(code?: string): any | null {
    const room = this.getRoom(code);
    if (!room) return null;
    const activePlayers = Object.values(room.players).filter(
      (p) => p && (p.connected === true || (p.lastDisconnectedAt && Date.now() - p.lastDisconnectedAt < 5000)),
    );
    if (activePlayers.length === 0) return null;
    return this.formatRoomSummary(room, activePlayers.length);
  }

  getLobbiesList(): any[] {
    const valid: any[] = [];
    for (const r of Array.from(this.customRooms.values())) {
      const activePlayers = Object.values(r.players).filter(
        (p) => p && (p.connected === true || (p.lastDisconnectedAt && Date.now() - p.lastDisconnectedAt < 5000)),
      );
      if (activePlayers.length === 0) {
        this.deleteRoom(r.id);
        continue;
      }
      this.ensureActiveHost(r);
      if (r.isPrivate) continue;
      valid.push(this.formatRoomSummary(r, activePlayers.length));
    }
    return valid;
  }

  deleteRoom(roomId: string) {
    if (this.customRooms.has(roomId)) {
      this.customRooms.delete(roomId);
      this.logger.log(`Room ${roomId} deleted.`);
    }
  }
}
