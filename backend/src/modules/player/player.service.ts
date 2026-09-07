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
    const users = await this.userRepository.find({
      select: [
        'id',
        'username',
        'avatar',
        'wins',
        'losses',
        'xp',
        'level',
        'presidentCount',
        'neutralCount',
        'trouducCount',
      ],
    });

    // Trier uniquement par `wins DESC` ne suffit pas : à 0 victoire, un
    // joueur qui a fini "Neutre" (0 victoire / 0 défaite) et un joueur qui
    // n'a JAMAIS joué (0/0 aussi) sont indiscernables, et sans critère de
    // repli TypeORM les ordonne arbitrairement — c'est ce qui pouvait
    // classer un joueur inactif devant des joueurs ayant réellement joué.
    // Un joueur n'a "joué" que s'il a au moins une victoire, une défaite ou
    // un titre neutre à son actif ; ceux qui n'ont rien de tout ça sont
    // toujours relégués en fin de classement, groupés ensemble à 0/0/0.
    const hasPlayed = (u: User) => u.wins + u.losses + u.neutralCount > 0;

    return users
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins; // + de victoires d'abord
        const aPlayed = hasPlayed(a);
        const bPlayed = hasPlayed(b);
        if (aPlayed !== bPlayed) return aPlayed ? -1 : 1; // joueur actif avant joueur jamais entré en partie
        if (a.losses !== b.losses) return a.losses - b.losses; // moins de défaites d'abord
        return a.username.localeCompare(b.username); // ordre stable en dernier recours
      })
      .slice(0, 20);
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
