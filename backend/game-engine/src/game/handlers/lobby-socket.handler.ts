import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { GameService } from '../game.service';
import { CryptoService } from '../../security/crypto.service';
import { getClientId } from './connection.handler';
import {
  createGameRoom,
  createPlayer,
  generateRoomCode,
  isCallsignTaken,
  sanitizeText,
} from '../factories/lobby.factory';
import { AdmissionHandler } from './admission.handler';

const MAX_CUSTOM_ROOMS = 100;

@Injectable()
export class LobbySocketHandler {
  constructor(
    private readonly gameService: GameService,
    private readonly crypto: CryptoService,
    private readonly admission: AdmissionHandler,
  ) {}

  handleGetLobbies(socket: Socket) {
    socket.emit('lobbies_list', this.gameService.getLobbiesList());
  }

  handleCheckUsername(socket: Socket, data: any) {
    const raw = typeof data === 'string' ? data : data?.username;
    const clean = sanitizeText(raw, 18);
    const clientId = getClientId(socket);

    if (!clean || clean.length < 2) {
      socket.emit('username_check_result', { username: raw, available: false, reason: 'Too short' });
      return;
    }

    const allRooms = Array.from(this.gameService.roomStore.customRooms.values());
    const isTaken = isCallsignTaken(allRooms, clean, clientId);
    socket.emit('username_check_result', {
      username: raw,
      available: !isTaken,
      reason: isTaken ? 'Codename already claimed' : null,
    });
  }

  handleCreateLobby(socket: Socket, server: Server, data: any) {
    const clientId = getClientId(socket);
    const username = sanitizeText(data?.username, 18, 'SquadLeader');

    if (!username || username.length < 2) {
      socket.emit('error_message', { message: 'Username must be at least 2 characters.' });
      return;
    }

    if (this.gameService.roomStore.customRooms.size >= MAX_CUSTOM_ROOMS) {
      socket.emit('error_message', { message: 'Maximum active room capacity reached. Please join an existing squad.' });
      return;
    }

    const existing = this.gameService.roomStore.findRoomByPlayer(clientId);
    if (existing) {
      // Auto-clean stale/ghost rooms instead of rejecting — prevents "already in squad" errors after refreshes
      // Leave the old room channel FIRST so the creating socket does not receive lobby_terminated
      socket.leave(existing.id);
      const isStaleHost = existing.hostId === clientId || existing.hostSocketId === socket.id;
      if (isStaleHost) {
        this.gameService.terminateLobby(existing.id, server, 'Squad Leader started a new session. Previous room closed.');
      } else {
        delete existing.players[clientId];
        if (Object.keys(existing.players).length === 0) {
          this.gameService.deleteRoom(existing.id);
          server.emit('lobbies_list', this.gameService.getLobbiesList());
        } else {
          this.gameService.broadcastLobbyUpdate(server, existing);
        }
      }
    }

    const allRooms = Array.from(this.gameService.roomStore.customRooms.values());
    if (isCallsignTaken(allRooms, username, clientId)) {
      socket.emit('error_message', { message: `Codename "${username}" is already claimed by an active player.` });
      return;
    }

    const roomId = generateRoomCode(this.gameService.roomStore.customRooms.keys());
    const room = createGameRoom(roomId, data?.name || `Squad ${roomId}`, clientId, socket.id, username, data);
    const hostPlayer = createPlayer(clientId, socket.id, username);
    room.players[clientId] = hostPlayer;

    let serverPublicKey: string | null = null;
    if (data?.clientPublicKey) {
      try {
        const serverEcdh = this.crypto.generateEcdhKeyPair();
        const aesKey = this.crypto.deriveAesKey(serverEcdh.privateKey, data.clientPublicKey);
        hostPlayer.aesKey = aesKey;
        hostPlayer.clientPublicKeyHex = data.clientPublicKey;
        serverPublicKey = serverEcdh.publicKeyHex;
        socket.emit('ecdh_derived', { serverPublicKey });
      } catch {}
    }

    this.gameService.roomStore.customRooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('lobby_joined', {
      roomId,
      code: room.code || roomId,
      isPrivate: Boolean(room.isPrivate),
      roomName: room.name,
      hostName: username,
      isHost: true,
      maxPlayers: room.maxPlayers,
      role: 'HOST',
      serverPublicKey,
      players: this.gameService.getLobbyPlayers(room),
      selectedRegion: room.selectedRegion,
      difficulty: room.difficulty,
      totalRounds: room.totalRounds,
      status: room.status,
    });
    this.gameService.broadcastLobbyUpdate(server, room);
    server.emit('lobbies_list', this.gameService.getLobbiesList());
  }

  handleFindRoomByCode(socket: Socket, data: any) {
    const rawCode = String(typeof data === 'string' ? data : data?.code || '').trim();
    const roomSummary = this.gameService.roomStore.findRoomSummaryByCode(rawCode);
    socket.emit('room_code_lookup_result', {
      code: rawCode,
      room: roomSummary,
    });
  }

  handleJoinLobby(socket: Socket, server: Server, data: any) {
    const clientId = getClientId(socket);
    const targetRoom = this.gameService.getRoom(data?.roomId);

    if (!targetRoom) {
      socket.emit('error_message', { message: 'Squad not found or already closed.' });
      return;
    }

    // Clean up from any old room
    const oldRoom = this.gameService.findRoomByPlayer(clientId);
    if (oldRoom && oldRoom.id !== targetRoom.id) {
      const isOldHost = oldRoom.hostId === clientId || oldRoom.hostSocketId === socket.id;
      if (isOldHost) {
        this.gameService.terminateLobby(oldRoom.id, server, 'Leader joined another squad. Room disbanded.');
      } else {
        delete oldRoom.players[clientId];
        socket.leave(oldRoom.id);
        if (Object.keys(oldRoom.players).length === 0) {
          this.gameService.deleteRoom(oldRoom.id);
          server.emit('lobbies_list', this.gameService.getLobbiesList());
        } else {
          this.gameService.broadcastLobbyUpdate(server, oldRoom);
        }
      }
    }

    const username = String(data?.username || 'Player').trim();
    if (!username || username.length < 2) {
      socket.emit('error_message', { message: 'Username must be at least 2 characters.' });
      return;
    }

    // Reconnect path OR host → directly admitted
    const isMember = Boolean(targetRoom.players[clientId]);
    const isHost = targetRoom.hostId === clientId || targetRoom.hostSocketId === socket.id;
    if (isMember || isHost) {
      return this.admission.admitPlayer(socket, server, targetRoom, clientId, username, data?.clientPublicKey);
    }

    if (isCallsignTaken([targetRoom], username, clientId)) {
      socket.emit('error_message', { message: `Codename "${username}" is already claimed in this squad.` });
      return;
    }

    const activeCount = Object.values(targetRoom.players).filter((p) => p && p.connected).length;
    if (activeCount >= (targetRoom.maxPlayers || 8)) {
      socket.emit('error_message', { message: `Squad is at maximum capacity (${targetRoom.maxPlayers || 8} players).` });
      return;
    }

    // Queue as pending — host must approve
    if (!targetRoom.pendingAdmissions) {
      targetRoom.pendingAdmissions = {};
    }

    const pendingKeys = Object.keys(targetRoom.pendingAdmissions);
    const isAlreadyPending = Boolean(targetRoom.pendingAdmissions[clientId]);

    if (!isAlreadyPending && pendingKeys.length >= 8) {
      socket.emit('error_message', { message: 'Squad admission queue is currently full. Please try again shortly.' });
      return;
    }

    targetRoom.pendingAdmissions[clientId] = {
      clientId,
      socketId: socket.id,
      username,
      clientPublicKey: data?.clientPublicKey,
      requestedAt: isAlreadyPending ? targetRoom.pendingAdmissions[clientId].requestedAt : Date.now(),
    };

    socket.emit('admission_pending', {
      roomId: targetRoom.id,
      roomName: targetRoom.name,
      message: 'Waiting for Squad Leader approval...',
    });

    // Only notify host if this is a fresh request to avoid toast/notification spam
    if (targetRoom.hostSocketId && !isAlreadyPending) {
      server.to(targetRoom.hostSocketId).emit('admission_request', {
        roomId: targetRoom.id,
        clientId,
        username,
        requestedAt: targetRoom.pendingAdmissions[clientId].requestedAt,
      });
    }
  }

  handleLeaveLobby(socket: Socket, server: Server, data: any) {
    const clientId = getClientId(socket);
    const roomId = data?.roomId;
    const room = roomId ? this.gameService.getRoom(roomId) : this.gameService.findRoomByPlayer(clientId);
    if (!room) {
      if (roomId) socket.leave(roomId);
      return;
    }

    if (room.pendingAdmissions) {
      const targetKey = room.pendingAdmissions[clientId]
        ? clientId
        : Object.keys(room.pendingAdmissions).find((k) => {
            const p = room.pendingAdmissions[k];
            return p?.socketId === socket.id || (data?.username && p?.username === data.username);
          });
      if (targetKey && room.pendingAdmissions[targetKey]) {
        const pendingUser = room.pendingAdmissions[targetKey]?.username;
        delete room.pendingAdmissions[targetKey];
        const cancelPayload = {
          roomId: room.id,
          clientId: targetKey,
          username: pendingUser,
          message: `Player "${pendingUser || targetKey}" cancelled their entry request.`,
        };
        server.to(room.id).emit('admission_cancelled', cancelPayload);
        if (room.hostSocketId) {
          server.to(room.hostSocketId).emit('admission_cancelled', cancelPayload);
        }
      }
    }

    if (room.crownElection && (clientId === room.crownElection.claimantId || clientId === room.crownElection.targetHostId)) {
      if (room.crownElection.hostTimeout) clearTimeout(room.crownElection.hostTimeout);
      if (room.crownElection.votingTimeout) clearTimeout(room.crownElection.votingTimeout);
      server.to(room.id).emit('crown_election_result', {
        success: false,
        newHost: room.hostName,
        message: 'Crown candidate left the squad. Challenge cancelled.',
      });
      room.crownElection = null;
      room.lastCrownElectionAt = Date.now();
    }

    // Only use hard identifiers — never trust username match or client-supplied isHost flag alone
    const wasHost = Boolean(
      (room.hostId && clientId === room.hostId) ||
      (room.hostSocketId && socket.id === room.hostSocketId)
    );

    if (wasHost) {
      this.gameService.terminateLobby(room.id, server, 'Squad Leader has left the room. Expedition disbanded.');
      socket.leave(room.id);
      return;
    }

    delete room.players[clientId];
    const key = Object.keys(room.players).find((k) => room.players[k]?.id === clientId || room.players[k]?.socketId === socket.id);
    if (key) delete room.players[key];

    socket.leave(room.id);
    const remainingCount = Object.keys(room.players).length;
    if (remainingCount === 0) {
      this.gameService.deleteRoom(room.id);
      server.emit('lobbies_list', this.gameService.getLobbiesList());
      return;
    }

    this.gameService.broadcastLobbyUpdate(server, room);
    server.to(room.id).emit('player_left', { id: clientId, username: data?.username, remainingCount });
    this.gameService.guessEvaluator.checkAllGuessed(server, room);
  }
}
