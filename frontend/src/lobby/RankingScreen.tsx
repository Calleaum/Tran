import { useEffect, useState } from 'react';
import { playHover } from '../sound';
import { playerService } from '../services/api';
import { PlayerAvatar } from '../components/PlayerAvatar';

interface RankingScreenProps {
  onBack: () => void;
}

// Renvoyé par `GET /players/leaderboard` (trié par victoires).
interface LeaderboardRow {
  id: string;
  username: string;
  avatar?: string | null;
  wins: number;
  losses: number;
  xp: number;
  level: number;
  presidentCount?: number;
  neutralCount?: number;
  trouducCount?: number;
}

const PODIUM_ICONS = ['🥇', '🥈', '🥉'];

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

  const podium = rows?.slice(0, 3) ?? [];
  const rest = rows?.slice(3) ?? [];

  return (
    <div className="submenu-screen submenu-screen--wide">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Classement</h2>

      {error && <p className="form-error">{error}</p>}
      {!rows && !error && <p className="placeholder-note">Chargement…</p>}

      {rows && rows.length === 0 && (
        <p className="placeholder-note">Aucun joueur classé pour le moment.</p>
      )}

      {rows && rows.length > 0 && (
        <>
          {podium.length > 0 && (
            <div className="podium">
              {/* Ordre visuel 2ᵉ / 1ᵉʳ / 3ᵉ pour un vrai effet podium */}
              {[podium[1], podium[0], podium[2]].map((row, slot) => {
                if (!row) return <div key={`empty-${slot}`} className="podium__slot podium__slot--empty" />;
                const rank = slot === 1 ? 0 : slot === 0 ? 1 : 2;
                return (
                  <div key={row.id} className={`podium__slot podium__slot--rank-${rank + 1}`}>
                    <span className="podium__medal">{PODIUM_ICONS[rank]}</span>
                    <PlayerAvatar name={row.username} avatar={row.avatar} className="podium__avatar" />
                    <span className="podium__name">{row.username}</span>
                    <span className="podium__wins">{row.wins} victoires · {row.losses} défaites</span>
                    <div className="podium__stats">
                      <span className="title-pill title-pill--president">⚜️ {row.presidentCount ?? 0}</span>
                      <span className="title-pill title-pill--neutral">😐 {row.neutralCount ?? 0}</span>
                      <span className="title-pill title-pill--trouduc">💩 {row.trouducCount ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <table className="ranking-table">
            <thead>
              <tr>
                <th>Rang</th>
                <th>Joueur</th>
                <th>Victoires</th>
                <th>Défaites</th>
                <th>Niveau</th>
                <th>XP</th>
                <th className="ranking-table__title-col" title="Nombre de fois Président">⚜️ Président</th>
                <th className="ranking-table__title-col" title="Nombre de fois Neutre">😐 Neutre</th>
                <th className="ranking-table__title-col" title="Nombre de fois Trou du cul">💩 Trou du cul</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((row, idx) => (
                <tr key={row.id} className="ranking-table__row">
                  <td className="ranking-table__rank">{idx + 4}</td>
                  <td>
                    <div className="ranking-table__player">
                      <PlayerAvatar name={row.username} avatar={row.avatar} className="ranking-table__avatar" />
                      <span>{row.username}</span>
                    </div>
                  </td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.level}</td>
                  <td>{row.xp}</td>
                  <td className="ranking-table__title-col">
                    <span className="title-pill title-pill--president">{row.presidentCount ?? 0}</span>
                  </td>
                  <td className="ranking-table__title-col">
                    <span className="title-pill title-pill--neutral">{row.neutralCount ?? 0}</span>
                  </td>
                  <td className="ranking-table__title-col">
                    <span className="title-pill title-pill--trouduc">{row.trouducCount ?? 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
