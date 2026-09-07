import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  username!: string;

  // Nullable : un compte créé via OAuth 42 n'a pas de mot de passe local.
  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  avatar?: string;

  // Identifiant unique de l'utilisateur sur l'API 42 (login OAuth).
  // Nullable : uniquement présent pour les comptes créés/liés via 42.
  @Column({ unique: true, nullable: true })
  fortyTwoId?: string;

  @Column({ default: 0 })
  wins!: number;

  @Column({ default: 0 })
  losses!: number;

  // ─── Titres "Président" ──────────────────────────────────────────────
  // Nombre de manches terminées (dans n'importe quelle partie) où ce
  // joueur a porté chaque titre. Mis à jour manche par manche, en même
  // temps que wins/losses (voir PresidentService.updateStats) — PAS
  // seulement quand la partie entière est terminée, sinon ces compteurs
  // resteraient à 0 dans la quasi-totalité des parties (personne ne clique
  // jamais sur "Terminer la partie").
  @Column({ default: 0 })
  presidentCount!: number;

  @Column({ default: 0 })
  neutralCount!: number;

  @Column({ default: 0 })
  trouducCount!: number;

  // ─── Système d'XP ────────────────────────────────────────────────────
  // XP cumulé sur toute la vie du compte. Un palier = 1000 XP
  // (voir XpService.LEVEL_XP_THRESHOLD, source de vérité pour ce calcul).
  @Column({ default: 0 })
  xp!: number;

  // Dénormalisé à partir de `xp` pour trier/afficher facilement
  // (leaderboard, profil...) sans recalcul côté client. Toujours
  // recalculé et sauvegardé par XpService en même temps que `xp`.
  @Column({ default: 1 })
  level!: number;

  // Récompenses obtenues (pour l'instant : simples badges texte,
  // ex. "palier_2"). Le contenu exact des récompenses n'est pas encore
  // décidé ; ce champ sert de base extensible en attendant.
  @Column({ type: 'jsonb', default: '[]' })
  badges!: string[];

  @Column({ default: false })
  twoFactorEnabled!: boolean;

  @Column({ nullable: true })
  twoFactorSecret?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
