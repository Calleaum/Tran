import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { XP_BY_TITLE, XP_PARTICIPATION_DEFAULT, LEVEL_XP_THRESHOLD } from './xp.constants';

export interface XpAwardResult {
  userId: string;
  title: string;
  xpGained: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  newBadges: string[];
}

export interface XpProfile {
  userId: string;
  xp: number;
  level: number;
  badges: string[];
  // XP déjà acquis dans le palier courant / XP requis pour le prochain palier
  xpIntoLevel: number;
  xpForNextLevel: number;
}

@Injectable()
export class XpService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ─── Barème ──────────────────────────────────────────────────────────

  getXpForTitle(title: string | undefined): number {
    if (!title) return XP_PARTICIPATION_DEFAULT;
    return XP_BY_TITLE[title] ?? XP_PARTICIPATION_DEFAULT;
  }

  levelForXp(xp: number): number {
    return Math.floor(Math.max(0, xp) / LEVEL_XP_THRESHOLD) + 1;
  }

  // ─── Attribution en masse pour une partie terminée ─────────────────

  // `titles` vient de PresidentRulesService.getTitles(finalRankings).
  // Ne récompense que les joueurs présents dans `titles` (= joueurs qui
  // ont un classement final connu pour cette manche).
  async awardForGame(titles: Record<string, string>): Promise<Record<string, XpAwardResult>> {
    const results: Record<string, XpAwardResult> = {};

    for (const [userId, title] of Object.entries(titles)) {
      const amount = this.getXpForTitle(title);
      try {
        const awarded = await this.awardXp(userId, amount, title);
        results[userId] = awarded;
      } catch {
        // Un joueur supprimé entre-temps ne doit pas faire planter la fin
        // de partie pour tout le monde.
        continue;
      }
    }

    return results;
  }

  // ─── Attribution unitaire ────────────────────────────────────────────

  async awardXp(userId: string, amount: number, title = 'Neutre'): Promise<XpAwardResult> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Joueur introuvable');

    const oldLevel = this.levelForXp(user.xp);
    const totalXp = user.xp + amount;
    const newLevel = this.levelForXp(totalXp);

    const newBadges: string[] = [];
    if (newLevel > oldLevel) {
      for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
        const badge = `palier_${lvl}`;
        if (!user.badges.includes(badge)) newBadges.push(badge);
      }
    }

    user.xp = totalXp;
    user.level = newLevel;
    if (newBadges.length > 0) user.badges = [...user.badges, ...newBadges];

    await this.userRepo.save(user);

    return {
      userId,
      title,
      xpGained: amount,
      totalXp,
      level: newLevel,
      leveledUp: newLevel > oldLevel,
      newBadges,
    };
  }

  // ─── Lecture ─────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<XpProfile> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Joueur introuvable');

    const xpIntoLevel = user.xp % LEVEL_XP_THRESHOLD;

    return {
      userId: user.id,
      xp: user.xp,
      level: user.level,
      badges: user.badges,
      xpIntoLevel,
      xpForNextLevel: LEVEL_XP_THRESHOLD,
    };
  }

  async getLeaderboard(limit = 20): Promise<Partial<User>[]> {
    return this.userRepo.find({
      select: ['id', 'username', 'avatar', 'xp', 'level', 'badges'],
      order: { xp: 'DESC' },
      take: limit,
    });
  }
}
