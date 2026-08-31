import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// Snapshot immuable d'une partie terminée.
// Contrairement à PresidentGame (qui contient l'état vivant, y compris les
// mains), cette table ne garde que ce qui a un sens une fois la partie finie :
// qui a joué, dans quel ordre ils ont fini, et quand.
@Entity('game_history')
export class GameHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Référence vers la PresidentGame d'origine (pas de FK stricte pour
  // rester simple, mais unique pour éviter les doublons si finish()
  // est appelé plusieurs fois par erreur).
  @Index({ unique: true })
  @Column()
  gameId!: string;

  // Tous les joueurs ayant participé à la partie (ordre d'entrée en salle)
  @Column({ type: 'jsonb' })
  playerIds!: string[];

  // Classement final de la dernière manche jouée : [0] = gagnant, [last] = perdant
  @Column({ type: 'jsonb', default: '[]' })
  rankings!: string[];

  // Rôle de chaque joueur pour cette manche : { userId: 'Président' | ... }
  @Column({ type: 'jsonb', default: '{}' })
  titles!: Record<string, string>;

  // Dénormalisé pour requêtes rapides / leaderboard, nullable si la partie
  // a été arrêtée avant qu'aucune manche ne soit terminée
  @Column({ nullable: true })
  winnerId?: string;

  @Column({ nullable: true })
  loserId?: string;

  @Column({ default: 1 })
  roundsPlayed!: number;

  // XP gagné par chaque joueur pour CETTE partie précisément : { userId: xpGagné }.
  // Dénormalisé ici (en plus du total cumulé sur User) pour que l'historique
  // reste une trace fidèle même si les barèmes d'XP changent plus tard.
  @Column({ type: 'jsonb', default: '{}' })
  xpAwarded!: Record<string, number>;

  @Column()
  startedAt!: Date;

  // Horodatage de fin = date de création de cette ligne
  @CreateDateColumn()
  finishedAt!: Date;
}
