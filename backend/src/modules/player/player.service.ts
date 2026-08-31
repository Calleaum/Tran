import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Partial<User>[]> {
    return this.userRepository.find({
      select: ['id', 'username', 'avatar', 'wins', 'losses', 'xp', 'level', 'createdAt'],
      order: { username: 'ASC' },
    });
  }

  async getLeaderboard(): Promise<Partial<User>[]> {
    return this.userRepository.find({
      select: ['id', 'username', 'avatar', 'wins', 'losses', 'xp', 'level'],
      order: { wins: 'DESC' },
      take: 20,
    });
  }

  async findOne(id: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'avatar', 'wins', 'losses', 'xp', 'level', 'badges', 'createdAt'],
    });
    if (!user) throw new NotFoundException('Player not found');
    return user;
  }

  async updateProfile(
    currentUserId: string,
    targetId: string,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    if (currentUserId !== targetId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const user = await this.userRepository.findOne({ where: { id: targetId } });
    if (!user) throw new NotFoundException('Player not found');

    if (dto.username) user.username = dto.username;
    if (dto.avatar !== undefined) user.avatar = dto.avatar;

    const saved = await this.userRepository.save(user);
    return {
      id: saved.id,
      username: saved.username,
      avatar: saved.avatar,
      wins: saved.wins,
      losses: saved.losses,
      xp: saved.xp,
      level: saved.level,
    };
  }

  async getStats(id: string): Promise<object> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Player not found');

    const totalGames = user.wins + user.losses;
    const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      wins: user.wins,
      losses: user.losses,
      totalGames,
      winRate,
      xp: user.xp,
      level: user.level,
      badges: user.badges,
    };
  }
}
