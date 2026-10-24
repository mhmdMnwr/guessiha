import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { ConnectionHandler, getClientId } from './handlers/connection.handler';
import { LobbySocketHandler } from './handlers/lobby-socket.handler';
import { MatchControlHandler } from './handlers/match-control.handler';
import { GuessHandler } from './handlers/guess.handler';
import { HostActionHandler } from './handlers/host-action.handler';
import { MatchParamsHandler } from './handlers/match-params.handler';
import { GameParticipationHandler } from './handlers/game-participation.handler';
import { AdmissionHandler } from './handlers/admission.handler';
import { CrownElectionHandler } from './handlers/crown-election.handler';
import { GameRoom } from './game.types';

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  maxHttpBufferSize: 65536,
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly rateLimits = new Map<string, { count: number; resetAt: number; spamScore: number }>();

  constructor(
    private readonly gameService: GameService,
    private readonly connectionHandler: ConnectionHandler,
    private readonly lobbyHandler: LobbySocketHandler,
    private readonly matchControl: MatchControlHandler,
    private readonly guessHandler: GuessHandler,
    private readonly hostActions: HostActionHandler,
    private readonly matchParams: MatchParamsHandler,
    private readonly gameParticipation: GameParticipationHandler,
    private readonly admissionHandler: AdmissionHandler,
    private readonly crownElection: CrownElectionHandler,
  ) {}

  private setupRateLimiter(socket: Socket) {
    socket.use(([event, ...args], next) => {
      const now = Date.now();
      let record = this.rateLimits.get(socket.id);
      if (!record || now > record.resetAt) {
        record = { count: 1, resetAt: now + 1000, spamScore: 0 };
        this.rateLimits.set(socket.id, record);
      } else {
        record.count++;
      }

      const sensitiveEvents = [
        'check_username',
        'create_lobby',
        'join_lobby',
        'find_room_by_code',
        'claim_host',
        'start_game',
        'next_round',
      ];
      if (sensitiveEvents.includes(event)) {
        record.spamScore += 4;
      } else {
        record.spamScore += 1;
      }

      if (record.count > 35 || record.spamScore > 40) {
        if (record.count === 36) {
          socket.emit('error_message', { message: 'Too many requests. Please slow down.' });
        }
        return;
      }

      next();
    });
  }

  public resolveRoom(socket: Socket, data?: any): GameRoom | null {
    const clientId = getClientId(socket);
    if (data && typeof data === 'object' && data.roomId) {
      const r = this.gameService.getRoom(data.roomId);
      if (r) {
        const isMemberOrHost =
          Boolean(r.players[clientId]) ||
          r.hostId === clientId ||
          r.hostSocketId === socket.id ||
          Object.values(r.players).some((p) => p && (p.id === clientId || p.socketId === socket.id));
        if (isMemberOrHost) return r;
      }
    }
    return this.gameService.findRoomByPlayer(clientId);
  }

  handleConnection(socket: Socket) {
    this.setupRateLimiter(socket);
    this.connectionHandler.handleConnection(socket, this.server);
  }

  handleDisconnect(socket: Socket) {
    this.rateLimits.delete(socket.id);
    this.connectionHandler.handleDisconnect(socket, this.server);
  }

  @SubscribeMessage('get_lobbies')
  handleGetLobbies(@ConnectedSocket() socket: Socket) {
    this.lobbyHandler.handleGetLobbies(socket);
  }

  @SubscribeMessage('find_room_by_code')
  handleFindRoomByCode(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.lobbyHandler.handleFindRoomByCode(socket, data);
  }

  @SubscribeMessage('check_username')
  handleCheckUsername(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.lobbyHandler.handleCheckUsername(socket, data);
  }

  @SubscribeMessage('create_lobby')
  handleCreateLobby(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.lobbyHandler.handleCreateLobby(socket, this.server, data);
  }

  @SubscribeMessage('join_lobby')
  handleJoinLobby(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.lobbyHandler.handleJoinLobby(socket, this.server, data);
  }

  @SubscribeMessage('leave_lobby')
  handleLeaveLobby(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.lobbyHandler.handleLeaveLobby(socket, this.server, data);
  }

  @SubscribeMessage('start_game')
  handleStartGame(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchControl.handleStartGame(socket, this.server, room);
  }

  @SubscribeMessage('next_round')
  handleNextRound(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchControl.handleNextRound(socket, this.server, room);
  }

  @SubscribeMessage('stop_game')
  handleStopGame(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchControl.handleStopGame(socket, this.server, room);
  }

  @SubscribeMessage('reset_to_lobby')
  handleResetToLobby(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchControl.handleResetToLobby(socket, this.server, room);
  }

  @SubscribeMessage('place_pin')
  handlePlacePin(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.guessHandler.handlePlacePin(socket, room, data);
  }

  @SubscribeMessage('lock_guess')
  handleLockGuess(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) return this.guessHandler.handleLockGuess(socket, this.server, room, data);
  }

  @SubscribeMessage('host_heartbeat')
  handleHostHeartbeat(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    socket.emit('heartbeat_ack', { success: true, timestamp: Date.now() });
  }

  @SubscribeMessage('transfer_host')
  handleTransferHost(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.hostActions.handleTransferHost(socket, this.server, room, data);
  }

  @SubscribeMessage('claim_host')
  handleClaimHost(@ConnectedSocket() socket: Socket) {
    const room = this.resolveRoom(socket);
    if (room) this.hostActions.handleClaimHost(socket, this.server, room);
  }

  @SubscribeMessage('host_share_image')
  handleHostShareImage(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.hostActions.handleHostShareImage(socket, this.server, room, data);
  }

  @SubscribeMessage('kick_player')
  handleKickPlayer(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.hostActions.handleKickPlayer(socket, this.server, room, data);
  }

  @SubscribeMessage('set_total_rounds')
  handleSetTotalRounds(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchParams.handleSetTotalRounds(socket, this.server, room, data);
  }

  @SubscribeMessage('set_max_players')
  handleSetMaxPlayers(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchParams.handleSetMaxPlayers(socket, this.server, room, data);
  }

  @SubscribeMessage('set_countdown_duration')
  handleSetCountdownDuration(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchParams.handleSetCountdownDuration(socket, this.server, room, data);
  }

  @SubscribeMessage('set_region')
  handleSetRegion(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchParams.handleSetRegion(socket, this.server, room, data);
  }

  @SubscribeMessage('set_difficulty')
  handleSetDifficulty(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.matchParams.handleSetDifficulty(socket, this.server, room, data);
  }

  @SubscribeMessage('join_game')
  handleJoinGame(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.gameParticipation.handleJoinGame(socket, this.server, room);
  }

  @SubscribeMessage('leave_game')
  handleLeaveGame(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.gameParticipation.handleLeaveGame(socket, this.server, room, data);
  }

  @SubscribeMessage('admit_player')
  handleAdmitPlayer(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.admissionHandler.handleAdmitPlayer(socket, this.server, data);
  }

  @SubscribeMessage('reject_player')
  handleRejectPlayer(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    this.admissionHandler.handleRejectPlayer(socket, this.server, data);
  }

  @SubscribeMessage('demand_crown')
  handleDemandCrown(@ConnectedSocket() socket: Socket, @MessageBody() data?: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.crownElection.handleDemandCrown(socket, this.server, room);
  }

  @SubscribeMessage('respond_crown_demand')
  handleRespondCrownDemand(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.crownElection.handleRespondDemand(socket, this.server, room, data);
  }

  @SubscribeMessage('vote_crown')
  handleVoteCrown(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    const room = this.resolveRoom(socket, data);
    if (room) this.crownElection.handleVoteCrown(socket, this.server, room, data);
  }
}
