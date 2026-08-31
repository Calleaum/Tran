import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PresidentService } from 'src/modules/president/president.service';
import { Card, PresidentGameStatus } from 'src/entities/president-game.entity';
import { RateLimiterService } from 'src/modules/chat/rate-limit/rate-limiter.service';

interface AuthSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger('GameGateway');
  private connectedUsers = new Map<string, string>(); // socketId → userId

  constructor(
    private jwtService: JwtService,
    private presidentService: PresidentService,
    private rateLimiter: RateLimiterService,
  ) {}

  // ─── Connexion / Déconnexion ───────────────────────────────────────────

  async handleConnection(client: AuthSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      this.connectedUsers.set(client.id, payload.sub);
      client.join(`user:${payload.sub}`);
      this.server.emit('user:online', { userId: payload.sub });
      this.logger.log(`Connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthSocket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.server.emit('user:offline', { userId });

      void (async () => {
        const games = await this.presidentService.findByUser(userId);
        for (const game of games) {
          const result = await this.presidentService.leave(game.id, userId);
          if (result.removed) {
            await this.broadcastLeave(result.game, result.events, userId);
          }
        }
      })();

      this.logger.log(`Disconnected: ${userId}`);
    }
  }

  // ─── Rejoindre une salle de jeu ────────────────────────────────────────

  @SubscribeMessage('president:join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: string },
  ) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const game = await this.presidentService.findOne(data.gameId);
      client.join(`president:${data.gameId}`);

      // Envoyer l'état public au joueur qui rejoint
      const publicState = game.state
        ? this.presidentService.getPublicState(game.state, client.userId)
        : null;

      return { success: true, game: { ...game, state: publicState } };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Rejoindre la partie (s'inscrire comme joueur) ─────────────────────

  @SubscribeMessage('president:join')
  async handleJoin(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { gameId: string }) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const game = await this.presidentService.join(data.gameId, client.userId);
      client.join(`president:${data.gameId}`);

      // Notifier tous les joueurs de la salle
      this.server.to(`president:${data.gameId}`).emit('president:player_joined', {
        userId: client.userId,
        playerIds: game.playerIds,
      });

      return { success: true, playerIds: game.playerIds };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  @SubscribeMessage('president:leave')
  async handleLeave(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { gameId: string }) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const result = await this.presidentService.leave(data.gameId, client.userId);
      if (result.removed) {
        await this.broadcastLeave(result.game, result.events, client.userId);
      }
      return { success: true };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Démarrer la partie ────────────────────────────────────────────────

  @SubscribeMessage('president:start')
  async handleStart(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: string },
  ) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const game = await this.presidentService.start(data.gameId, client.userId);
      const state = game.state!;

      // Envoyer à chaque joueur son état personnalisé (sa propre main)
      for (const playerId of state.playerIds) {
        const personalState = this.presidentService.getPublicState(state, playerId);
        this.server.to(`user:${playerId}`).emit('president:game_started', {
          gameId: game.id,
          state: personalState,
          currentPlayerId: state.playerIds[state.currentPlayerIndex],
        });
      }

      return { success: true };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Jouer des cartes ──────────────────────────────────────────────────

  @SubscribeMessage('president:play')
  async handlePlay(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: string; cards: Card[] },
  ) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const { game, events } = await this.presidentService.playCards(
        data.gameId,
        client.userId,
        data.cards,
      );
      await this.broadcastGameState(game, events);
      return { success: true, events };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Passer son tour ───────────────────────────────────────────────────

  @SubscribeMessage('president:pass')
  async handlePass(@ConnectedSocket() client: AuthSocket, @MessageBody() data: { gameId: string }) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const { game, events } = await this.presidentService.pass(data.gameId, client.userId);
      await this.broadcastGameState(game, events);
      return { success: true, events };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Terminer la partie ────────────────────────────────────────────────

  @SubscribeMessage('president:finish')
  async handleFinish(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: string },
  ) {
    if (!client.userId) return this.err('Non authentifié');
    try {
      const game = await this.presidentService.finish(data.gameId, client.userId);
      const titles = this.presidentService.getTitles(game.finalRankings);

      this.server.to(`president:${data.gameId}`).emit('president:game_finished', {
        gameId: game.id,
        finalRankings: game.finalRankings,
        titles,
      });

      return { success: true };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Broadcast de l'état après chaque action ──────────────────────────

  private async broadcastGameState(game: any, events: string[]) {
    const state = game.state;
    if (!state) return;

    const currentPlayerId = state.playerIds[state.currentPlayerIndex];

    // Envoyer à chaque joueur son état personnalisé
    for (const playerId of state.playerIds) {
      const personalState = this.presidentService.getPublicState(state, playerId);
      this.server.to(`user:${playerId}`).emit('president:state_updated', {
        gameId: game.id,
        state: personalState,
        currentPlayerId,
        events,
      });
    }

    // Broadcast public (sans mains) à tous dans la room (observateurs éventuels)
    this.server.to(`president:${game.id}`).emit('president:table_updated', {
      gameId: game.id,
      currentPile: state.currentPile,
      currentPlayerId,
      handSizes: Object.fromEntries(
        Object.entries(state.hands as Record<string, any[]>).map(([id, cards]) => [
          id,
          cards.length,
        ]),
      ),
      rankings: state.rankings,
      events,
    });
  }

  private async broadcastLeave(game: any, events: string[], leftUserId: string) {
    this.server.to(`president:${game.id}`).emit('president:player_left', {
      gameId: game.id,
      userId: leftUserId,
      playerIds: game.playerIds,
      status: game.status,
    });

    if (game.state) {
      const state = game.state;
      const currentPlayerId = state.playerIds[state.currentPlayerIndex] ?? null;

      for (const playerId of state.playerIds) {
        const personalState = this.presidentService.getPublicState(state, playerId);
        this.server.to(`user:${playerId}`).emit('president:state_updated', {
          gameId: game.id,
          state: personalState,
          currentPlayerId,
          events,
        });
      }
    }

    if (game.status === PresidentGameStatus.CANCELLED || !game.state) {
      this.server.to(`president:${game.id}`).emit('president:game_finished', {
        gameId: game.id,
        status: game.status,
        endedByLeave: true,
        finalRankings: game.finalRankings,
        titles: game.finalRankings.length > 0 ? this.presidentService.getTitles(game.finalRankings) : {},
        events,
      });
      return;
    }

    const state = game.state;
    const currentPlayerId = state.playerIds[state.currentPlayerIndex] ?? null;

    for (const playerId of state.playerIds) {
      const personalState = this.presidentService.getPublicState(state, playerId);
      this.server.to(`user:${playerId}`).emit('president:state_updated', {
        gameId: game.id,
        state: personalState,
        currentPlayerId,
        events,
      });
    }

    this.server.to(`president:${game.id}`).emit('president:table_updated', {
      gameId: game.id,
      currentPile: state.currentPile,
      currentPlayerId,
      handSizes: Object.fromEntries(
        Object.entries(state.hands as Record<string, any[]>).map(([id, cards]) => [
          id,
          cards.length,
        ]),
      ),
      rankings: state.rankings,
      events,
    });
  }

  // ─── Invitations ──────────────────────────────────────────────────────

  @SubscribeMessage('president:invite')
  handleInvite(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { targetUserId: string; gameId: string },
  ) {
    if (!client.userId) return this.err('Non authentifié');
    this.server.to(`user:${data.targetUserId}`).emit('president:invitation', {
      fromUserId: client.userId,
      gameId: data.gameId,
    });
    return { success: true };
  }

  // ─── Chat de partie ─────────────────────────────────────────────────────
  // Tout le monde dans la room `president:<gameId>` peut VOIR les messages
  // (joueurs et spectateurs, via president:join_room), mais seuls les
  // joueurs assis (game.playerIds) peuvent ENVOYER. Volontairement non
  // persisté en base : discussion éphémère qui disparaît à la fin de la
  // partie. Pour un historique, ce serait ici qu'il faudrait brancher un
  // ChatService dédié.

  @SubscribeMessage('president:chat:send')
  async handleGameChat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { gameId: string; content: string },
  ) {
    if (!client.userId) return this.err('Non authentifié');

    const room = `president:${data.gameId}`;
    if (!client.rooms.has(room)) {
      return this.err('Rejoins la partie avant de discuter (president:join_room)');
    }

    const content = (data.content || '').trim();
    if (!content) return this.err('Message vide');
    if (content.length > 500) return this.err('Message trop long (max 500 caractères)');

    const rateLimitKey = `game-chat:${client.userId}`;
    if (!this.rateLimiter.consume(rateLimitKey)) {
      const retryAfter = this.rateLimiter.retryAfterSeconds(rateLimitKey);
      return this.err(`Tu envoies trop de messages, réessaie dans ${retryAfter}s`);
    }

    try {
      const game = await this.presidentService.findOne(data.gameId);
      if (!game.playerIds.includes(client.userId)) {
        return this.err(
          'Seuls les joueurs peuvent parler — les spectateurs peuvent seulement lire',
        );
      }

      const payload = {
        gameId: data.gameId,
        userId: client.userId,
        content,
        createdAt: new Date().toISOString(),
      };

      // Broadcast à toute la room — joueurs ET spectateurs le reçoivent,
      // même si seuls les joueurs ont le droit d'envoyer.
      this.server.to(room).emit('president:chat:message', payload);

      return { success: true };
    } catch (e: any) {
      return this.err(e.message);
    }
  }

  // ─── Méthodes utilitaires ──────────────────────────────────────────────

  private err(message: string) {
    return { success: false, error: message };
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.values());
  }
}
