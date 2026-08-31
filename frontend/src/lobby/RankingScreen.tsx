import { useEffect, useState } from 'react';
import { playHover } from '../sound';
import { playerService } from '../services/api';

interface RankingScreenProps {
  onBack: () => void;
}

// Renvoyé par `GET /players/leaderboard` (trié par victoires).
interface LeaderboardRow {
  id: string;
  username: string;
  wins: number;
  losses: number;
  xp: number;
  level: number;
}

export function RankingScreen({ onBack }: RankingScreenProps) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    playerService
      .getLeaderboard()
      .then((data) => { if (!cancelled) setRows(data as LeaderboardRow[]); })
      .catch(() => { if (!cancelled) setError('Classement indisponible pour le moment.'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Classement</h2>

      {error && <p className="form-error">{error}</p>}
      {!rows && !error && <p className="placeholder-note">Chargement…</p>}

      {rows && rows.length === 0 && (
        <p className="placeholder-note">Aucun joueur classé pour le moment.</p>
      )}

      {rows && rows.length > 0 && (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Joueur</th>
              <th>Victoires</th>
              <th>Défaites</th>
              <th>Niveau</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id}>
                <td>{idx + 1}</td>
                <td>{row.username}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.level}</td>
                <td>{row.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
