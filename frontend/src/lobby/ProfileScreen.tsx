import { useEffect, useState } from 'react';
import { playHover } from '../sound';
import { playerService } from '../services/api';

interface ProfileScreenProps {
  user: { id: string; username: string; email: string };
  onBack: () => void;
}

// Renvoyé par `GET /players/:id/stats`.
interface PlayerStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  xp: number;
  level: number;
  badges: string[];
}

export function ProfileScreen({ user, onBack }: ProfileScreenProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    playerService
      .getStats(user.id)
      .then((data) => { if (!cancelled) setStats(data as PlayerStats); })
      .catch(() => { if (!cancelled) setError('Statistiques indisponibles pour le moment.'); });
    return () => { cancelled = true; };
  }, [user.id]);

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Profil</h2>

      <div className="profile-card">
        <div className="profile-card__avatar">{user.username.charAt(0).toUpperCase()}</div>
        <div className="profile-card__info">
          <span className="profile-card__name">{user.username}</span>
          <span className="profile-card__email">{user.email}</span>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box">
          <span className="stat-box__value">{stats ? stats.totalGames : '—'}</span>
          <span className="stat-box__label">Parties jouées</span>
        </div>
        <div className="stat-box">
          <span className="stat-box__value">{stats ? stats.wins : '—'}</span>
          <span className="stat-box__label">Victoires</span>
        </div>
        <div className="stat-box">
          <span className="stat-box__value">{stats ? `${stats.winRate} %` : '—'}</span>
          <span className="stat-box__label">Taux de victoire</span>
        </div>
        <div className="stat-box">
          <span className="stat-box__value">{stats ? stats.level : '—'}</span>
          <span className="stat-box__label">Niveau</span>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
