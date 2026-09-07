import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// ─── Types cartes ────────────────────────────────────────────────────────────

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  rank: Rank;
  suit: Suit;
}

// ─── Types état de jeu ───────────────────────────────────────────────────────

export interface PlayerHand {
  userId: string;
  cards: Card[];
}

export interface Pile {
  cards: Card[]; // cartes posées sur le pli courant
  playedBy: string; // userId du dernier joueur
  count: number; // nombre de cartes posées (1, 2, 3, 4)
}

// Détail d'un transfert de cartes lors de l'échange en début de manche
export interface CardTransfer {
  fromId: string; // qui a donné les cartes
  toId: string; // qui les a reçues
  cards: Card[]; // les cartes données par fromId à toId
}

export type PresidentPhase =
  | 'waiting' // en attente de joueurs
  | 'exchange' // échange président/con
  | 'playing' // en cours
  | 'round_end' // fin d'une manche
  | 'finished'; // fin de la partie

// Instantané de la dernière manche réellement terminée. Nécessaire car
// `rankings` est vidé et une nouvelle manche démarre automatiquement dès
// qu'une manche se termine (dans le même appel serveur) : au moment où
// quelqu'un clique "Terminer la partie", `rankings` est donc TOUJOURS vide.
// Sans cet instantané, on perd le résultat de la dernière manche jouée.
export interface LastCompletedRound {
  roundNumber: number;
  rankings: string[];
  titles: Record<string, string>;
}

export interface PresidentGameState {
  // Joueurs
  playerIds: string[]; // ordre de jeu
  hands: Record<string, Card[]>; // main de chaque joueur (privée !)
  rankings: string[]; // ordre d'arrivée (président=0, con=last)

  // Table
  currentPile: Pile | null; // pli en cours
  lastPiles: Pile[]; // historique des 5 derniers plis
  passedPlayers: string[]; // joueurs qui ont passé ce tour

  // Tour
  currentPlayerIndex: number; // index dans playerIds
  roundNumber: number; // numéro de manche EN COURS (peut être incomplète)

  // Phase
  phase: PresidentPhase;

  // Échange (début de manche 2+)
  exchangePending: Record<string, string[]> | null;
  // { presidentId: [card1], vicePresidentId: [card2] } → cartes à donner

  // Rôles de la manche en cours (calculés à partir du classement de la
  // manche précédente). null pendant la toute première manche.
  roles: Record<string, string> | null;
  // { userId: 'Président' | 'Vice-président' | 'Neutre' | 'Vice-trou du cul' | 'Trou du cul' }

  // Détail de l'échange de cartes qui vient d'avoir lieu au début de la
  // manche en cours. null pendant la toute première manche.
  lastExchange: CardTransfer[] | null;

  // Dernière manche COMPLÈTE (voir LastCompletedRound). null si aucune
  // manche n'a encore été terminée.
  lastCompletedRound: LastCompletedRound | null;

  // Fin de partie
  finalRankings: string[]; // classement final toutes manches
}

export enum PresidentGameStatus {
  WAITING = 'waiting',
  IN_PROGRESS = 'in_progress',
  FINISHED = 'finished',
  CANCELLED = 'cancelled',
}

// ─── Entité ──────────────────────────────────────────────────────────────────

@Entity('president_games')
export class PresidentGame {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nom affiché du salon, choisi par le créateur. Optionnel : les parties
  // créées avant l'ajout de ce champ (ou sans nom saisi) restent à null,
  // le front retombe alors sur "Salon <id>".
  @Column({ type: 'varchar', length: 40, nullable: true })
  name!: string | null;

  @Column({ default: 3 })
  minPlayers!: number;

  @Column({ default: 6 })
  maxPlayers!: number;

  // IDs des joueurs qui ont rejoint la salle
  @Column({ type: 'jsonb', default: '[]' })
  playerIds!: string[];

  // ID du créateur (le seul qui peut démarrer)
  @Column()
  creatorId!: string;

  @Column({
    type: 'enum',
    enum: PresidentGameStatus,
    default: PresidentGameStatus.WAITING,
  })
  status!: PresidentGameStatus;

  // État complet du jeu (mains, pile, tours, etc.)
  // Les mains sont stockées ici mais ne sont JAMAIS envoyées en clair à tous
  @Column({ type: 'jsonb', nullable: true })
  state!: PresidentGameState | null;

  // Classement final [président, vice-prez, ..., con]
  @Column({ type: 'jsonb', default: '[]' })
  finalRankings!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
