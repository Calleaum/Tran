import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameGateway } from './game.gateway';
import { PresidentModule } from 'src/modules/president/president.module';
import { RateLimiterModule } from 'src/modules/chat/rate-limit/rate-limiter.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    PresidentModule,
    RateLimiterModule,
  ],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GatewayModule {}
