import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { XpService } from './xp.service';
import { XpController } from './xp.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [XpController],
  providers: [XpService],
  exports: [XpService],
})
export class XpModule {}
