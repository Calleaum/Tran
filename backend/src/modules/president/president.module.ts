import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PresidentGame } from 'src/entities/president-game.entity';
import { User } from 'src/entities/user.entity';
import { PresidentService } from './president.service';
import { PresidentController } from './president.controller';
import { PresidentRulesService } from './president-rules.service';
import { GameHistoryModule } from 'src/modules/history/game-history.module';
import { XpModule } from 'src/modules/xp/xp.module';

@Module({
  imports: [TypeOrmModule.forFeature([PresidentGame, User]), GameHistoryModule, XpModule],
  controllers: [PresidentController],
  providers: [PresidentService, PresidentRulesService],
  exports: [PresidentService, PresidentRulesService],
})
export class PresidentModule {}
