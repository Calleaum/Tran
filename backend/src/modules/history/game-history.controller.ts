import { Controller, Get, Param, Query, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { GameHistoryService } from './game-history.service';
import { HistoryQueryDto } from './dto/history-query.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class GameHistoryController {
  constructor(private readonly svc: GameHistoryService) {}

  // GET /history?page=1&limit=10  → toutes les parties terminées, plus récentes d'abord
  @Get()
  findAll(@Query() query: HistoryQueryDto) {
    return this.svc.findAll(query.page ?? 1, query.limit ?? 10);
  }

  // GET /history/me?page=1&limit=10 → historique de l'utilisateur connecté
  @Get('me')
  findMine(@Request() req: any, @Query() query: HistoryQueryDto) {
    return this.svc.findByPlayer(req.user.id, query.page ?? 1, query.limit ?? 10);
  }

  // GET /history/player/:id?page=1&limit=10 → historique d'un joueur donné
  @Get('player/:id')
  findByPlayer(@Param('id', ParseUUIDPipe) id: string, @Query() query: HistoryQueryDto) {
    return this.svc.findByPlayer(id, query.page ?? 1, query.limit ?? 10);
  }

  // GET /history/:id → détail d'une partie (classement complet, titres, etc.)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id);
  }
}
