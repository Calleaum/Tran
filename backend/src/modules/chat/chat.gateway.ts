import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { FriendsService } from '../friends/friends.service';
import { PresenceService } from '../presence/presence.service';
import { RateLimiterService } from './rate-limit/rate-limiter.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendGlobalMessageDto } from './dto/send-global-message.dto';
import { extractUserIdFromSocket } from './ws/ws-auth.util';
import { resolveCorsOrigin } from '../../common/cors.util';

// One room per user (`user:<id>`) is the whole trick here: every socket a
// user opens (multiple tabs/devices) joins that room, so broadcasting to
// "this user" is just `server.to('user:<id>').emit(...)` regardless of how
// many sockets they have open.
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: resolveCorsOrigin(),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly friendsService: FriendsService,
    private readonly presenceService: PresenceService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  async handleConnection(socket: Socket) {
    const userId = extractUserIdFromSocket(this.jwtService, socket);
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.data.userId = userId;
    await socket.join(this.userRoom(userId));

    const wentOnline = this.presenceService.addSocket(userId, socket.id);
    this.logger.log(`Socket connected: user=${userId} socket=${socket.id}`);

    const messages = await this.chatService.getGlobalMessages();
    socket.emit('global:snapshot', {
      messages: await Promise.all(
        messages.map(async (message) => ({
          id: message.id,
          authorId: message.authorId,
          authorName: await this.chatService.getDisplayName(message.authorId),
          text: message.content,
          timestamp: message.createdAt.getTime(),
        })),
      ),
    });

    // Let the connecting client know which of their friends are currently online.
    const friendIds = await this.friendsService.getFriendIds(userId);
    socket.emit('presence:snapshot', {
      onlineFriendIds: this.presenceService.getOnlineUserIds(friendIds),
    });

    // Only announce to friends the first time this user comes online
    // (avoid spamming "online" on every extra tab they open).
    if (wentOnline) {
      for (const friendId of friendIds) {
        this.server.to(this.userRoom(friendId)).emit('friend:presence', {
          userId,
          online: true,
        });
      }
    }
  }

  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage('global:send')
  async handleGlobalMessage(@ConnectedSocket() socket: Socket, @MessageBody() dto: SendGlobalMessageDto) {
    const senderId = socket.data.userId as string;
    const content = dto.content.trim();
    if (!content) {
      return { status: 'error', message: 'empty_message' };
    }

    const rateLimitKey = `global:${senderId}`;
    if (!this.rateLimiter.consume(rateLimitKey)) {
      const retryAfter = this.rateLimiter.retryAfterSeconds(rateLimitKey);
      socket.emit('global:error', { message: 'Slow down — too many messages', retryAfter });
      return { status: 'error', message: 'rate_limited', retryAfter };
    }

    const payload = {
      id: '',
      authorId: senderId,
      authorName: await this.chatService.getDisplayName(senderId),
      text: content,
      timestamp: Date.now(),
    };

    const saved = await this.chatService.saveGlobalMessage(senderId, content);
    const emittedPayload = {
      id: saved.id,
      authorId: senderId,
      authorName: payload.authorName,
      text: saved.content,
      timestamp: saved.createdAt.getTime(),
    };

    this.server.emit('global:receive', emittedPayload);

    return { status: 'ok', message: emittedPayload };
  }

  async handleDisconnect(socket: Socket) {
    const userId = socket.data.userId as string | undefined;
    if (!userId) return;

    const wentOffline = this.presenceService.removeSocket(userId, socket.id);
    this.logger.log(`Socket disconnected: user=${userId} socket=${socket.id}`);

    if (wentOffline) {
      const friendIds = await this.friendsService.getFriendIds(userId);
      for (const friendId of friendIds) {
        this.server.to(this.userRoom(friendId)).emit('friend:presence', {
          userId,
          online: false,
        });
      }
    }
  }

  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage('dm:send')
  async handleDirectMessage(@ConnectedSocket() socket: Socket, @MessageBody() dto: SendMessageDto) {
    const senderId = socket.data.userId as string;

    const rateLimitKey = `dm:${senderId}`;
    if (!this.rateLimiter.consume(rateLimitKey)) {
      const retryAfter = this.rateLimiter.retryAfterSeconds(rateLimitKey);
      socket.emit('dm:error', { message: 'Slow down — too many messages', retryAfter });
      return { status: 'error', message: 'rate_limited', retryAfter };
    }

    try {
      const message = await this.chatService.sendMessage(senderId, dto.receiverId, dto.content);
      const payload = {
        id: message.id,
        senderId,
        receiverId: dto.receiverId,
        content: message.content,
        createdAt: message.createdAt,
      };

      // deliver to every tab the receiver has open...
      this.server.to(this.userRoom(dto.receiverId)).emit('dm:receive', payload);
      // ...and echo back to every tab the sender has open, so their other tabs stay in sync
      this.server.to(this.userRoom(senderId)).emit('dm:sent', payload);

      return { status: 'ok', message: payload };
    } catch (err: any) {
      socket.emit('dm:error', { message: err.message || 'Failed to send message' });
      return { status: 'error', message: err.message };
    }
  }

  @SubscribeMessage('dm:typing')
  handleTyping(@ConnectedSocket() socket: Socket, @MessageBody() dto: { receiverId: string }) {
    const senderId = socket.data.userId as string;
    if (!dto?.receiverId) return;
    this.server.to(this.userRoom(dto.receiverId)).emit('dm:typing', { userId: senderId });
  }

  @SubscribeMessage('dm:read')
  async handleRead(@ConnectedSocket() socket: Socket, @MessageBody() dto: { otherUserId: string }) {
    const userId = socket.data.userId as string;
    if (!dto?.otherUserId) return;
    await this.chatService.markAsRead(userId, dto.otherUserId);
    this.server.to(this.userRoom(dto.otherUserId)).emit('dm:read', { by: userId });
  }
}
