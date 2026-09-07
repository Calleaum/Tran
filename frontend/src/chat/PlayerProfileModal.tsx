import { useEffect, useState } from 'react';
import { SocialPlayer, STATUS_LABEL } from '../social/socialData';
import { playerService } from '../services/api';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { playHover } from '../sound';

interface PlayerProfileModalProps {
  player: SocialPlayer;
  onClose: () => void;
  onTalk?: () => void;
}

interface PlayerStats {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  xp: number;
  level: number;
  badges: string[];
}

export function PlayerProfileModal({ player, onClose, onTalk }: PlayerProfileModalProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    playerService
      .getStats(player.id)
      .then((data) => { if (!cancelled) setStats(data as PlayerStats); })
      .catch(() => { if (!cancelled) setError('Statistiques indisponibles pour le moment.'); });
    return () => { cancelled = true; };
  }, [player.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <h3>Profil de {player.name}</h3>
          <button className="modal-card__close" onMouseEnter={playHover} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="modal-card__body">
          <div className="profile-card">
            <PlayerAvatar
              name={player.name}
              avatar={player.avatar}
              className={`profile-card__avatar social-row__avatar--${player.status}`}
            />
            <div className="profile-card__info">
              <span className="profile-card__name">{player.name}</span>
              <span className="profile-card__email">{STATUS_LABEL[player.status]}</span>
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
              <span className="stat-box__value">{stats ? stats.level : '—'}</span>
              <span className="stat-box__label">Niveau</span>
            </div>
          </div>

          {error && <p className="placeholder-note">{error}</p>}

          {onTalk && (
            <button className="primary-btn" onMouseEnter={playHover} onClick={onTalk}>
              💬 Parler à {player.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
