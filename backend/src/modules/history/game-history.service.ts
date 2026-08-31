import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { GameHistory } from 'src/entities/game-history.entity';
import { PresidentGame } from 'src/entities/president-game.entity';
import { User } from 'src/entities/user.entity';

// ─── Contrats publics de l'API (ce que voit le front) ───────────────────────

export interface PlayerSummary {
  id: string;
  username: string;
  avatar: string | null;
}

export interface RankingEntry {
  rank: number; // 1 = gagnant
  player: PlayerSummary;
  title: string; // 'Président' | 'Vice-président' | 'Neutre' | 'Vice-trou du cul' | 'Trou du cul'
  xpGained: number; // XP gagné par ce joueur pour cette partie précise
}

export interface GameHistorySummary {
  id: string;
  gameId: string;
  startedAt: Date;
  finishedAt: Date;
  durationSeconds: number;
  roundsPlayed: number;
  players: PlayerSummary[];
  winner: PlayerSummary | null;
  loser: PlayerSummary | null;
}

export interface GameHistoryDetail extends GameHistorySummary {
  rankings: RankingEntry[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class GameHistoryService {
  constructor(
    @InjectRepository(GameHistory)
    private historyRepo: Repository<GameHistory>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ─── Écriture ────────────────────────────────────────────────────────────

  // Appelé par PresidentService.finish(). Idempotent : si un historique
  // existe déjà pour cette partie (double appel, retry...), on le renvoie
  // tel quel plutôt que de planter ou de dupliquer.
  async recordGame(
    game: PresidentGame,
    xpAwarded: Record<string, number> = {},
  ): Promise<GameHistory> {
    const existing = await this.historyRepo.findOne({ where: { gameId: game.id } });
    if (existing) return existing;

    const rankings = game.finalRankings ?? [];
    const roundsPlayed = game.state?.roundNumber ?? 1;
    const titles = rankings.length > 0 ? this.computeTitles(rankings) : {};

    const entry = this.historyRepo.create({
      gameId: game.id,
      playerIds: game.playerIds,
      rankings,
      titles,
      winnerId: rankings[0],
      loserId: rankings.length > 0 ? rankings[rankings.length - 1] : undefined,
      roundsPlayed,
      startedAt: game.createdAt,
      xpAwarded,
    });

    return this.historyRepo.save(entry);
  }

  // Réplique locale de PresidentRulesService.getTitles pour ne pas créer
  // de dépendance circulaire entre modules ; la logique est intentionnellement
  // minuscule et stable (ce sont les règles du jeu, pas un détail interne).
  private computeTitles(rankings: string[]): Record<string, string> {
    const n = rankings.length;
    const titles: Record<string, string> = {};
    rankings.forEach((id, i) => {
      if (i === 0) titles[id] = 'Président';
      else if (i === n - 1) titles[id] = 'Trou du cul';
      else if (n >= 4 && i === 1) titles[id] = 'Vice-président';
      else if (n >= 4 && i === n - 2) titles[id] = 'Vice-trou du cul';
      else titles[id] = 'Neutre';
    });
    return titles;
  }

  // ─── Lecture ─────────────────────────────────────────────────────────────

  async findAll(page: number, limit: number): Promise<PaginatedResult<GameHistorySummary>> {
    const [rows, total] = await this.historyRepo.findAndCount({
      order: { finishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const players = await this.loadPlayers(rows);
    return {
      data: rows.map((row) => this.toSummary(row, players)),
      meta: this.buildMeta(page, limit, total),
    };
  }

  async findByPlayer(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<GameHistorySummary>> {
    const qb = this.historyRepo
      .createQueryBuilder('h')
      .where(`h.playerIds @> :ids::jsonb`, { ids: JSON.stringify([userId]) })
      .orderBy('h.finishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const players = await this.loadPlayers(rows);

    return {
      data: rows.map((row) => this.toSummary(row, players)),
      meta: this.buildMeta(page, limit, total),
    };
  }

  async findOne(id: string): Promise<GameHistoryDetail> {
    const row = await this.historyRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Historique introuvable');

    const players = await this.loadPlayers([row]);
    return this.toDetail(row, players);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async loadPlayers(rows: GameHistory[]): Promise<Map<string, PlayerSummary>> {
    const ids = [...new Set(rows.flatMap((r) => r.playerIds))];
    if (ids.length === 0) return new Map();

    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'username', 'avatar'],
    });

    return new Map(
      users.map((u) => [u.id, { id: u.id, username: u.username, avatar: u.avatar ?? null }]),
    );
  }

  // Si un joueur a été supprimé depuis, on renvoie un placeholder plutôt
  // que de planter ou de perdre la ligne d'historique.
  private resolvePlayer(
    id: string | undefined,
    players: Map<string, PlayerSummary>,
  ): PlayerSummary | null {
    if (!id) return null;
    return players.get(id) ?? { id, username: 'Joueur supprimé', avatar: null };
  }

  private toSummary(row: GameHistory, players: Map<string, PlayerSummary>): GameHistorySummary {
    return {
      id: row.id,
      gameId: row.gameId,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      durationSeconds: Math.max(
        0,
        Math.round((new Date(row.finishedAt).getTime() - new Date(row.startedAt).getTime()) / 1000),
      ),
      roundsPlayed: row.roundsPlayed,
      players: row.playerIds.map((id) => this.resolvePlayer(id, players)!).filter(Boolean),
      winner: this.resolvePlayer(row.winnerId, players),
      loser: this.resolvePlayer(row.loserId, players),
    };
  }

  private toDetail(row: GameHistory, players: Map<string, PlayerSummary>): GameHistoryDetail {
    const rankings: RankingEntry[] = row.rankings.map((id, i) => ({
      rank: i + 1,
      player: this.resolvePlayer(id, players)!,
      title: row.titles[id] ?? 'Neutre',
      xpGained: row.xpAwarded?.[id] ?? 0,
    }));

    return { ...this.toSummary(row, players), rankings };
  }

  private buildMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}
