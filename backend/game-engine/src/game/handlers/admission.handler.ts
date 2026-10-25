import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { GameService } from '../game.service';
import { CryptoService } from '../../security/crypto.service';
import { getClientId } from './connection.handler';
import { createPlayer } from '../factories/lobby.factory';
import { GameRoom } from '../game.types';

@Injectable()
export class AdmissionHandler {
  constructor(
    private readonly gameService: GameService,
    private readonly crypto: CryptoService,
  ) {}

  admitPlayer(
    socket: Socket,
    server: Server,
    room: GameRoom,
    clientId: string,
    username: string,
    clientPublicKey?: string,
  ) {
    socket.join(room.id);
    const isReconnect = Boolean(room.players[clientId]);
    let player = room.players[clientId];
    if (!player) {
      player = createPlayer(clientId, socket.id, username);
      room.players[clientId] = player;
    } else {
      player.socketId = socket.id;
      player.connected = true;
      player.username = username;
    }

    const isHost = room.hostId === clientId || room.hostSocketId === socket.id;
    if (isHost) {
      room.hostSocketId = socket.id;
      room.hostId = clientId;
    }

    let serverPublicKey: string | null = null;
    if (clientPublicKey) {
      try {
        const serverEcdh = this.crypto.generateEcdhKeyPair();
        const aesKey = this.crypto.deriveAesKey(serverEcdh.privateKey, clientPublicKey);
        player.aesKey = aesKey;
        player.clientPublicKeyHex = clientPublicKey;
        serverPublicKey = serverEcdh.publicKeyHex;
        socket.emit('ecdh_derived', { serverPublicKey });
      } catch {}
    }

    socket.emit('lobby_joined', {
      roomId: room.id,
      code: room.code || room.id,
      isPrivate: Boolean(room.isPrivate),
      roomName: room.name,
      hostName: room.hostName,
      isHost: Boolean(isHost),
      maxPlayers: room.maxPlayers,
      role: isHost ? 'HOST' : 'PLAYER',
      serverPublicKey,
      players: this.gameService.getLobbyPlayers(room),
      selectedRegion: room.selectedRegion,
      difficulty: room.difficulty,
      totalRounds: room.totalRounds,
      status: room.status,
    });
    this.gameService.broadcastLobbyUpdate(server, room);
    if (!isReconnect) {
      server.to(room.id).emit('player_entered_lobby', {
        username,
        clientId,
        roomId: room.id,
        totalPlayers: Object.keys(room.players).length,
      });
    }
    server.emit('lobbies_list', this.gameService.getLobbiesList());
  }

  handleAdmitPlayer(socket: Socket, server: Server, data: any) {
    const clientId = getClientId(socket);
    const room = this.gameService.getRoom(data?.roomId);
    if (!room) return;

    const isHost = (room.hostId && clientId === room.hostId) || (room.hostSocketId && socket.id === room.hostSocketId);
    if (!isHost) {
      socket.emit('error_message', { message: 'Only the Squad Leader can admit players.' });
      return;
    }

    if (!room.pendingAdmissions) {
      room.pendingAdmissions = {};
    }

    const targetClientId = data?.targetClientId;
    const pending = room.pendingAdmissions[targetClientId];
    if (!pending) {
      socket.emit('error_message', { message: 'Player is no longer requesting admission or has cancelled.' });
      socket.emit('admission_cancelled', {
        roomId: room.id,
        clientId: targetClientId,
      });
      return;
    }

    const pendingSocket = server.sockets.sockets.get(pending.socketId);
    delete room.pendingAdmissions[targetClientId];

    if (!pendingSocket) {
      socket.emit('error_message', { message: 'Player is no longer connected.' });
      socket.emit('admission_cancelled', {
        roomId: room.id,
        clientId: targetClientId,
      });
      this.gameService.broadcastLobbyUpdate(server, room);
      return;
    }

    this.admitPlayer(pendingSocket, server, room, pending.clientId, pending.username, pending.clientPublicKey);
  }

  handleRejectPlayer(socket: Socket, server: Server, data: any) {
    const clientId = getClientId(socket);
    const room = this.gameService.getRoom(data?.roomId);
    if (!room) return;

    const isHost = (room.hostId && clientId === room.hostId) || (room.hostSocketId && socket.id === room.hostSocketId);
    if (!isHost) {
      socket.emit('error_message', { message: 'Only the Squad Leader can reject players.' });
      return;
    }

    if (!room.pendingAdmissions) {
      room.pendingAdmissions = {};
    }

    const targetClientId = data?.targetClientId;
    const pending = room.pendingAdmissions[targetClientId];
    if (!pending) {
      socket.emit('admission_cancelled', {
        roomId: room.id,
        clientId: targetClientId,
      });
      return;
    }

    delete room.pendingAdmissions[targetClientId];
    const pendingSocket = server.sockets.sockets.get(pending.socketId);
    if (pendingSocket) {
      pendingSocket.emit('admission_rejected', {
        roomId: room.id,
        message: 'Your request to join the squad was rejected by the Leader.',
      });
    }
    this.gameService.broadcastLobbyUpdate(server, room);
  }

  handleCancelAdmissionRequest(socket: Socket, server: Server, data: any) {
    const clientId = data?.clientId || getClientId(socket);
    const roomId = data?.roomId;

    let targetRoom: GameRoom | null = roomId ? this.gameService.getRoom(roomId) : null;
    if (!targetRoom) {
      for (const r of this.gameService.roomStore.customRooms.values()) {
        if (
          r.pendingAdmissions &&
          (r.pendingAdmissions[clientId] ||
            (data?.username && Object.values(r.pendingAdmissions).some((p) => p.username === data.username)) ||
            Object.values(r.pendingAdmissions).some((p) => p.socketId === socket.id))
        ) {
          targetRoom = r;
          break;
        }
      }
    }

    if (!targetRoom || !targetRoom.pendingAdmissions) return;

    let targetKey: string | null = null;
    if (targetRoom.pendingAdmissions[clientId]) {
      targetKey = clientId;
    } else {
      const found = Object.keys(targetRoom.pendingAdmissions).find((k) => {
        const p = targetRoom.pendingAdmissions[k];
        return p?.socketId === socket.id || (data?.username && p?.username === data.username);
      });
      if (found) targetKey = found;
    }

    if (!targetKey || !targetRoom.pendingAdmissions[targetKey]) return;

    const pending = targetRoom.pendingAdmissions[targetKey];
    delete targetRoom.pendingAdmissions[targetKey];

    socket.leave(targetRoom.id);

    const cancelPayload = {
      roomId: targetRoom.id,
      clientId: targetKey,
      username: pending.username,
      message: `Player "${pending.username}" cancelled their entry request.`,
    };

    // 1. Emit to entire room so host definitely receives it
    server.to(targetRoom.id).emit('admission_cancelled', cancelPayload);

    // 2. Direct emit to hostSocketId if known
    if (targetRoom.hostSocketId) {
      server.to(targetRoom.hostSocketId).emit('admission_cancelled', cancelPayload);
    }

    // 3. Direct emit to any host socket by hostId
    if (targetRoom.hostId) {
      for (const s of server.sockets.sockets.values()) {
        if (getClientId(s) === targetRoom.hostId) {
          s.emit('admission_cancelled', cancelPayload);
        }
      }
    }

    socket.emit('admission_cancelled_ack', {
      roomId: targetRoom.id,
      success: true,
    });

    this.gameService.broadcastLobbyUpdate(server, targetRoom);
  }

  getClientId = getClientId;
}
