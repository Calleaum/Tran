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

  @Column()
  password!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: 0 })
  wins!: number;

  @Column({ default: 0 })
  losses!: number;

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
