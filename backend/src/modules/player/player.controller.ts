import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { PlayerService } from './player.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

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

  // POST /players/:id/avatar : upload d'une photo de profil (multipart/form-data,
  // champ "avatar"). Le fichier est stocké sur disque puis son URL relative
  // (/uploads/avatars/xxx.jpg) est enregistrée sur le user.
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (_req, file, callback) => {
          const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException('Format d’image non supporté'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }
    return this.playerService.updateProfile(req.user.id, id, {
      avatar: `/uploads/avatars/${file.filename}`,
    });
  }
}
