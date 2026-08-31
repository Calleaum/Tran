import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PresidentService } from './president.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('president')
@UseGuards(JwtAuthGuard)
export class PresidentController {
  constructor(private readonly svc: PresidentService) {}

  // GET /president
  @Get()
  findAll() {
    return this.svc.findAll();
  }

  // GET /president/me
  @Get('me')
  findMine(@Request() req: any) {
    return this.svc.findByUser(req.user.id);
  }

  // GET /president/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(id);
  }

  // GET /president/:id/state  → état public (sans mains adverses)
  @Get(':id/state')
  async getState(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const game = await this.svc.findOne(id);
    if (!game.state) return { phase: 'waiting' };
    return this.svc.getPublicState(game.state, req.user.id);
  }

  // POST /president
  @Post()
  create(@Request() req: any) {
    return this.svc.create(req.user.id);
  }

  // POST /president/:id/join
  @Post(':id/join')
  join(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.svc.join(id, req.user.id);
  }

  // PATCH /president/:id/start
  @Patch(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.svc.start(id, req.user.id);
  }

  // PATCH /president/:id/finish
  @Patch(':id/finish')
  finish(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.svc.finish(id, req.user.id);
  }
}
