import { Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { GameService } from '../game.service';
import { getClientId } from './connection.handler';
import { GameRoom } from '../game.types';

@Injectable()
export class GameParticipationHandler {
  constructor(private readonly gameService: GameService) {}

  handleJoinGame(socket: Socket, server: Server, room: GameRoom) {
    const clientId = getClientId(socket);
    const player = room.players[clientId];

    if (!player) {
      socket.emit('error_message', { message: 'Operative not found in squad.' });
      return;
    }
    if (room.status === 'LOBBY') {
      return;
    }

    player.inGame = true;
    player.connected = true;
    player.socketId = socket.id;

    const inGamePlayers = Object.values(room.players).filter((p) => p && p.connected && p.inGame !== false);
    const guessedCount = inGamePlayers.filter((p) => p.hasGuessed).length;
    const totalPlayers = inGamePlayers.length;

    const players = inGamePlayers.map((p) => ({
      id: p.id,
      username: p.username,
      totalScore: p.totalScore || 0,
      hasGuessed: Boolean(p.hasGuessed),
      isHost: (room.hostId && p.id === room.hostId) || (room.hostSocketId && p.socketId === room.hostSocketId),
      connected: p.connected,
    }));

    if (room.status === 'ROUND_ACTIVE' || room.status === 'ROUND_COUNTDOWN') {
      socket.emit('round_started', {
        roomId: room.id,
        round: room.currentRound,
        totalRounds: room.totalRounds,
        difficulty: room.roundTarget?.difficulty || room.difficulty,
        uplinkToken: room.roundUplinkToken || null,
        roadToken: room.roadToken || null,
        sharedImage: room.currentSharedImage || null,
        guessedCount,
        totalPlayers,
        countdownSeconds: room.countdownSeconds,
        firstGuesserName: room.firstGuesserName,
        isHost: (room.hostId && clientId === room.hostId) || (room.hostSocketId && socket.id === room.hostSocketId),
        hasGuessed: Boolean(player.hasGuessed),
        myPin: player.lockedGuess || null,
        totalScore: player.totalScore || 0,
        players,
      });
    } else if (room.status === 'ROUND_RESULTS') {
      socket.emit('round_results', room.lastRoundResults);
    } else if (room.status === 'GAME_OVER') {
      socket.emit('game_over', room.lastGameOver);
    }

    server.to(room.id).emit('player_joined', {
      username: player.username,
      totalPlayers,
    });
  }

  handleLeaveGame(socket: Socket, server: Server, room: GameRoom, data?: any) {
    const clientId = getClientId(socket);
    const player = room.players[clientId];
    const wasHost = (room.hostId && clientId === room.hostId) ||
      room.hostSocketId === socket.id ||
      Boolean(data?.isHost && (clientId === room.hostId || socket.id === room.hostSocketId));

    if (wasHost) {
      this.gameService.terminateLobby(
        room.id,
        server,
        `Squad Leader (${player?.username || 'Host'}) has exited the game. Expedition disbanded.`,
      );
      socket.leave(room.id);
      return;
    }

    if (player) {
      delete room.players[clientId];
      const key = Object.keys(room.players).find((k) => room.players[k]?.id === clientId || room.players[k]?.socketId === socket.id);
      if (key) delete room.players[key];
    }
    socket.leave(room.id);
    const remainingCount = Object.keys(room.players).length;
    if (remainingCount === 0) {
      this.gameService.deleteRoom(room.id);
      server.emit('lobbies_list', this.gameService.getLobbiesList());
      return;
    }
    server.to(room.id).emit('player_left', { username: player?.username, remainingCount });
    this.gameService.guessEvaluator.checkAllGuessed(server, room);
    this.gameService.broadcastLobbyUpdate(server, room);
  }
}
