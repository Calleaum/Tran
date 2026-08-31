import { Controller, Get, Param, Request, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { XpService } from './xp.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('xp')
@UseGuards(JwtAuthGuard)
export class XpController {
  constructor(private readonly xpService: XpService) {}

  // GET /xp/me
  @Get('me')
  getMine(@Request() req: any) {
    return this.xpService.getProfile(req.user.id);
  }

  // GET /xp/leaderboard
  @Get('leaderboard')
  getLeaderboard() {
    return this.xpService.getLeaderboard();
  }

  // GET /xp/:id
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.xpService.getProfile(id);
  }
}
