import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/entities/message.entity';
import { GlobalChatMessage } from 'src/entities/global-chat-message.entity';
import { User } from 'src/entities/user.entity';
import { FriendsModule } from '../friends/friends.module';
import { PresenceModule } from '../presence/presence.module';
import { RateLimiterModule } from './rate-limit/rate-limiter.module';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, GlobalChatMessage, User]),
    FriendsModule,
    PresenceModule,
    RateLimiterModule,
    // Gateway verifies its own tokens via JwtService, independent of the
    // passport HTTP strategy used for REST routes.
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
