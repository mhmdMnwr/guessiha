import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameRoom, Player } from './game.types';
import { RoomStoreService } from './services/room-store.service';
import { RoundCoordinatorService } from './services/round-coordinator.service';
import { GuessEvaluatorService } from './services/guess-evaluator.service';
import { TimerService } from './services/timer.service';
import { GeoDatabaseService } from '../geo-database/geo-database.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    public readonly roomStore: RoomStoreService,
    public readonly roundCoordinator: RoundCoordinatorService,
    public readonly guessEvaluator: GuessEvaluatorService,
    public readonly timerService: TimerService,
    private readonly geoDb: GeoDatabaseService,
  ) {}

  getRoom(roomId?: string): GameRoom | null {
    return this.roomStore.getRoom(roomId);
  }

  findRoomByPlayer(id: string): GameRoom | null {
    return this.roomStore.findRoomByPlayer(id);
  }

  ensureActiveHost(room: GameRoom) {
    return this.roomStore.ensureActiveHost(room);
  }

  getLobbyPlayers(room: GameRoom) {
    return this.roomStore.getLobbyPlayers(room);
  }

  getLobbiesList() {
    return this.roomStore.getLobbiesList();
  }

  deleteRoom(id: string) {
    const room = this.getRoom(id);
    if (room?.crownElection) {
      if (room.crownElection.hostTimeout) clearTimeout(room.crownElection.hostTimeout);
      if (room.crownElection.votingTimeout) clearTimeout(room.crownElection.votingTimeout);
      room.crownElection = null;
    }
    this.roomStore.deleteRoom(id);
  }

  transferHost(room: GameRoom, newHostPlayer: Player, server: Server) {
    const prevHostName = room.hostName || 'Host';
    room.hostId = newHostPlayer.id;
    room.hostSocketId = newHostPlayer.socketId;
    room.hostName = newHostPlayer.username;

    const payload = {
      previousHost: prevHostName,
      newHost: newHostPlayer.username,
      newHostId: newHostPlayer.publicId || newHostPlayer.id,
    };
    server.to(room.id).emit('host_transferred', payload);
    this.broadcastLobbyUpdate(server, room);
  }

  async startGame(
    senderId: string,
    server: Server,
    room: GameRoom,
  ): Promise<{ success: boolean; error?: string }> {
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }
    const targetRoom = room;
    if (targetRoom.status !== 'LOBBY') {
      return { success: false, error: 'Match already active in this room.' };
    }

    this.ensureActiveHost(targetRoom);
    const active = Object.values(targetRoom.players).filter((p) => p && p.connected === true);
    if (active.length === 0) {
      return { success: false, error: 'At least 1 player must join before starting.' };
    }

    const isAuthorized =
      (targetRoom.hostId && senderId === targetRoom.hostId) ||
      (targetRoom.hostSocketId && senderId === targetRoom.hostSocketId);

    if (!isAuthorized) {
      return { success: false, error: 'Only the host (Squad Leader) can start the game.' };
    }

    let pool = await this.geoDb.getLocations({
      region: targetRoom.selectedRegion,
      difficulty: targetRoom.difficulty,
    });
    if (!pool || pool.length < targetRoom.totalRounds) {
      pool = await this.geoDb.getLocations({ region: targetRoom.selectedRegion });
    }
    if (!pool || pool.length < targetRoom.totalRounds) {
      pool = await this.geoDb.getLocations({});
    }

    if (!targetRoom.recentLocationKeys) {
      targetRoom.recentLocationKeys = new Set<string>();
    }
    // Cap recent keys so after many games the pool doesn't get fully exhausted
    if (targetRoom.recentLocationKeys.size > 1500) {
      targetRoom.recentLocationKeys.clear();
    }

    targetRoom.selectedLocations = this.roundCoordinator.selectDiverseLocations(
      pool,
      targetRoom.totalRounds,
      targetRoom.recentLocationKeys,
      { region: targetRoom.selectedRegion, difficulty: targetRoom.difficulty },
    );

    if (targetRoom.selectedLocations.length === 0) {
      return { success: false, error: 'No locations available to start the match.' };
    }
    if (targetRoom.selectedLocations.length < targetRoom.totalRounds) {
      targetRoom.totalRounds = targetRoom.selectedLocations.length;
    }

    for (const p of Object.values(targetRoom.players)) {
      p.totalScore = 0;
      p.inGame = true;
    }

    try {
      await this.roundCoordinator.startRound(1, server, targetRoom);
      server.emit('lobbies_list', this.getLobbiesList());
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Failed to start round 1 for room ${targetRoom.id}: ${err?.message || err}`);
      targetRoom.status = 'LOBBY';
      return { success: false, error: 'Failed to initialize round locations.' };
    }
  }

  stopGame(
    senderId: string,
    server: Server,
    room: GameRoom,
  ): { success: boolean; error?: string } {
    if (!room) {
      return { success: false, error: 'Room not found.' };
    }
    const targetRoom = room;
    this.ensureActiveHost(targetRoom);

    const isAuthorized =
      (targetRoom.hostId && senderId === targetRoom.hostId) ||
      (targetRoom.hostSocketId && senderId === targetRoom.hostSocketId);

    if (!isAuthorized) {
      return { success: false, error: 'Only the host (Squad Leader) can stop the game.' };
    }

    this.timerService.clearCountdown(targetRoom);
    targetRoom.status = 'LOBBY';
    targetRoom.currentRound = 0;
    targetRoom.selectedLocations = [];
    targetRoom.roundTarget = null;
    targetRoom.lastRoundResults = null;

    for (const p of Object.values(targetRoom.players)) {
      p.totalScore = 0;
      p.currentPin = null;
      p.lockedGuess = null;
      p.hasGuessed = false;
      p.inGame = true;
    }

    const payload = {
      roomId: targetRoom.id,
      message: 'The squad leader returned the room to Lobby.',
      players: this.getLobbyPlayers(targetRoom),
      selectedRegion: targetRoom.selectedRegion,
      difficulty: targetRoom.difficulty,
      status: 'LOBBY',
      currentRound: 0,
    };

    server.to(targetRoom.id).emit('game_stopped', payload);
    server.to(targetRoom.id).emit('return_to_lobby', payload);
    server.emit('lobbies_list', this.getLobbiesList());
    return { success: true };
  }

  broadcastLobbyUpdate(server: Server, room: GameRoom) {
    if (!room) return;
    const targetRoom = room;
    this.ensureActiveHost(targetRoom);
    const payload = {
      roomId: targetRoom.id,
      code: targetRoom.code || targetRoom.id,
      isPrivate: Boolean(targetRoom.isPrivate),
      roomName: targetRoom.name,
      players: this.getLobbyPlayers(targetRoom),
      hostName: targetRoom.hostName,
      selectedRegion: targetRoom.selectedRegion,
      difficulty: targetRoom.difficulty,
      totalRounds: targetRoom.totalRounds,
      countdownDuration: targetRoom.countdownDuration,
      maxPlayers: targetRoom.maxPlayers || 8,
      pendingAdmissions: Object.values(targetRoom.pendingAdmissions),
      gameStatus: {
        status: targetRoom.status,
        currentRound: targetRoom.currentRound,
        totalRounds: targetRoom.totalRounds,
      },
    };
    server.to(targetRoom.id).emit('lobby_update', payload);
    if (targetRoom.hostSocketId) {
      server.to(targetRoom.hostSocketId).emit('lobby_update', payload);
    }
    server.emit('lobbies_list', this.getLobbiesList());
  }

  terminateLobby(roomId: string, server: Server, reason: string) {
    const room = this.getRoom(roomId);
    if (!room) return;
    this.timerService.clearCountdown(room);
    if (room.crownElection) {
      if (room.crownElection.hostTimeout) clearTimeout(room.crownElection.hostTimeout);
      if (room.crownElection.votingTimeout) clearTimeout(room.crownElection.votingTimeout);
      room.crownElection = null;
    }
    for (const pending of Object.values(room.pendingAdmissions || {})) {
      if (pending?.socketId) {
        server.to(pending.socketId).emit('admission_rejected', { roomId, message: reason });
      }
    }
    room.players = {};
    room.pendingAdmissions = {};
    this.deleteRoom(roomId);
    server.to(roomId).emit('lobby_terminated', { roomId, reason, message: reason });
    try { (server.in(roomId) as any).socketsLeave(roomId); } catch {}
    server.emit('lobbies_list', this.getLobbiesList());
  }
}
