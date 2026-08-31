import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PlayerModule } from './modules/player/player.module';
import { PresidentModule } from './modules/president/president.module';
import { GameHistoryModule } from './modules/history/game-history.module';
import { XpModule } from './modules/xp/xp.module';
import { PresenceModule } from './modules/presence/presence.module';
import { FriendsModule } from './modules/friends/friends.module';
import { ChatModule } from './modules/chat/chat.module';
import { GatewayModule } from './gateway/gateway.module';
import { User } from './entities/user.entity';
import { PresidentGame } from './entities/president-game.entity';
import { GameHistory } from './entities/game-history.entity';
import { Friendship } from './entities/friendship.entity';
import { Message } from './entities/message.entity';
import { GlobalChatMessage } from './entities/global-chat-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'transcendence',
      entities: [User, PresidentGame, GameHistory, Friendship, Message, GlobalChatMessage],
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    PlayerModule,
    PresidentModule,
    GameHistoryModule,
    XpModule,
    PresenceModule,
    FriendsModule,
    ChatModule,
    GatewayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
