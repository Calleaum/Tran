import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameHistory } from 'src/entities/game-history.entity';
import { User } from 'src/entities/user.entity';
import { GameHistoryService } from './game-history.service';
import { GameHistoryController } from './game-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GameHistory, User])],
  controllers: [GameHistoryController],
  providers: [GameHistoryService],
  exports: [GameHistoryService],
})
export class GameHistoryModule {}
