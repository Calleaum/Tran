import { useEffect, useState } from 'react';
import { playHover, playClick } from '../sound';
import { playerService } from '../services/api';
import { ApiPlayer } from '../social/socialData';
import { TournamentPlayer } from './bracket';

interface CreateTournamentProps {
  onBack: () => void;
  onCreate: (players: TournamentPlayer[], tableSize: number) => void;
}

const TABLE_SIZE_OPTIONS = [2, 3, 4, 5, 6];

export function CreateTournament({ onBack, onCreate }: CreateTournamentProps) {
  const [tableSize, setTableSize] = useState(4);
  const [players, setPlayers] = useState<ApiPlayer[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Les participants sont choisis parmi les joueurs réellement inscrits :
  // aucun joueur n'est inventé pour remplir le tableau.
  useEffect(() => {
    let cancelled = false;
    playerService
      .getAll()
      .then((data) => { if (!cancelled) setPlayers(data as ApiPlayer[]); })
      .catch(() => { if (!cancelled) setError('Impossible de charger la liste des joueurs.'); });
    return () => { cancelled = true; };
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPlayers: TournamentPlayer[] = (players ?? [])
    .filter((p) => selected.has(p.id))
    .map((p) => ({ id: p.id, name: p.username }));

  const enoughPlayers = selectedPlayers.length >= tableSize;
  const qualifiedFirstRound =
    Math.ceil(selectedPlayers.length / tableSize) * Math.max(1, Math.floor(tableSize / 2));

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour</button>
      <h2 className="submenu-title">Créer un tournoi</h2>

      <div className="tourney-config">
        <div className="tourney-config__field">
          <label>Participants ({selectedPlayers.length} sélectionné(s))</label>
          {error && <p className="form-error">{error}</p>}
          {!players && !error && <p className="placeholder-note">Chargement des joueurs…</p>}
          {players && players.length === 0 && (
            <p className="placeholder-note">Aucun joueur inscrit pour le moment.</p>
          )}
          {players && players.length > 0 && (
            <ul className="modal-card__member-list">
              {players.map((player) => (
                <li key={player.id}>
                  <label className="modal-card__member-row">
                    <input
                      type="checkbox"
                      checked={selected.has(player.id)}
                      onChange={() => toggle(player.id)}
                    />
                    <span className="social-row__avatar social-row__avatar--small">
                      {player.username.charAt(0)}
                    </span>
                    <span>{player.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="tourney-config__field">
          <label>Joueurs par table</label>
          <div className="pill-row">
            {TABLE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                className={`pill${tableSize === n ? ' pill--active' : ''}`}
                onMouseEnter={playHover}
                onClick={() => { playClick(); setTableSize(n); }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="tourney-config__summary">
          <p>
            <strong>{Math.ceil(selectedPlayers.length / tableSize) || 0}</strong> table(s) au premier tour,
            environ <strong>{enoughPlayers ? qualifiedFirstRound : 0}</strong> joueur(s) qualifiés pour la suite.
          </p>
          <p className="placeholder-note">
            À chaque table, environ la moitié des joueurs se qualifie pour le
            tour suivant. Les joueurs non qualifiés d'un même tour se
            retrouvent ensemble sur des tables "repêchage".
          </p>
        </div>

        <button
          className="primary-btn"
          onMouseEnter={playHover}
          disabled={!enoughPlayers}
          onClick={() => { playClick(); onCreate(selectedPlayers, tableSize); }}
        >
          {enoughPlayers
            ? 'Générer le tableau'
            : `Sélectionne au moins ${tableSize} joueurs`}
        </button>
      </div>
    </div>
  );
}
