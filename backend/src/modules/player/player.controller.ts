import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  // GET /players
  @Get()
  findAll() {
    return this.playerService.findAll();
  }

  // GET /players/leaderboard
  @Get('leaderboard')
  getLeaderboard() {
    return this.playerService.getLeaderboard();
  }

  // GET /players/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.playerService.findOne(id);
  }

  // GET /players/:id/stats
  @Get(':id/stats')
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.playerService.getStats(id);
  }

  // PATCH /players/:id
  @Patch(':id')
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.playerService.updateProfile(req.user.id, id, dto);
  }
}
