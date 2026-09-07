import { useCallback, useEffect, useState } from 'react';
import { playHover, playClick } from '../sound';
import { presidentService } from '../services/api';
import { getGameSocket } from '../services/socket';

interface PlayMenuProps {
  onBack: () => void;
  onEnterRoom: (gameId: string, options?: { spectate?: boolean }) => void;
  /** Erreur à afficher au premier rendu (ex : on revient d'un salon dont la partie a disparu). */
  initialError?: string | null;
}

// Renvoyé par `GET /president`.
interface PresidentGame {
  id: string;
  name: string | null;
  creatorId: string;
  playerIds: string[];
  minPlayers: number;
  maxPlayers: number;
  status: 'waiting' | 'in_progress' | 'finished' | 'cancelled';
  createdAt: string;
}

const STATUS_LABEL: Record<PresidentGame['status'], string> = {
  waiting: 'En attente de joueurs',
  in_progress: 'Partie en cours',
  finished: 'Terminée',
  cancelled: 'Annulée',
};

export function PlayMenu({ onBack, onEnterRoom, initialError = null }: PlayMenuProps) {
  const [games, setGames] = useState<PresidentGame[] | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const [newGameName, setNewGameName] = useState('');

  const reload = useCallback(async () => {
    try {
      const data = (await presidentService.getAll()) as PresidentGame[];
      setGames(data);
      setError(null);
    } catch {
      setError('Impossible de charger la liste des parties.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createGame() {
    playClick();
    setBusy(true);
    try {
      const game = (await presidentService.create(newGameName.trim() || undefined)) as PresidentGame;
      setNewGameName('');
      onEnterRoom(game.id);
    } catch {
      setError('Impossible de créer une partie.');
    } finally {
      setBusy(false);
    }
  }

  function joinGame(game: PresidentGame) {
    playClick();
    // On s'inscrit comme joueur via le socket, puis on entre dans la salle.
    getGameSocket().emit(
      'president:join',
      { gameId: game.id },
      (ack: { success?: boolean; error?: string }) => {
        if (ack?.success) onEnterRoom(game.id);
        else setError(ack?.error ?? 'Impossible de rejoindre cette partie.');
      },
    );
  }

  function spectateGame(game: PresidentGame) {
    playClick();
    onEnterRoom(game.id, { spectate: true });
  }

  const openGames = (games ?? []).filter((g) => g.status === 'waiting' || g.status === 'in_progress');

  return (
    <div className="submenu-screen">
      <button className="ghost-btn submenu-back" onMouseEnter={playHover} onClick={onBack}>← Retour au menu</button>
      <h2 className="submenu-title">Jouer</h2>

      <div className="form-field">
        <label htmlFor="new-game-name">Nom de la partie (optionnel)</label>
        <input
          id="new-game-name"
          type="text"
          maxLength={40}
          placeholder="Ex : Kiki la menace"
          value={newGameName}
          onChange={(e) => setNewGameName(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="choice-grid">
        <button
          className="choice-card"
          onMouseEnter={playHover}
          onClick={createGame}
          disabled={busy}
        >
          <span className="choice-card__icon">＋</span>
          <span className="choice-card__label">Créer une partie</span>
          <span className="choice-card__desc">Ouvre un salon et invite tes amis à te rejoindre</span>
        </button>
        <button
          className="choice-card"
          onMouseEnter={playHover}
          onClick={() => { playClick(); void reload(); }}
        >
          <span className="choice-card__icon">⟳</span>
          <span className="choice-card__label">Actualiser</span>
          <span className="choice-card__desc">Recharger la liste des salons ouverts</span>
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {!games && !error && <p className="placeholder-note">Chargement des parties…</p>}

      {games && openGames.length === 0 && (
        <div className="empty-state">
          <span className="empty-state__icon">♠</span>
          <p>Aucune partie ouverte pour le moment.</p>
        </div>
      )}

      {openGames.length > 0 && (
        <ul className="social-list">
          {openGames.map((game) => (
            <li key={game.id} className="social-row">
              <div className="social-row__info">
                <span className="social-row__name">{game.name || `Salon ${game.id.slice(0, 8)}`}</span>
                <span className="social-row__status">
                  {STATUS_LABEL[game.status]} — {game.playerIds.length}/{game.maxPlayers} joueurs
                </span>
              </div>
              <div className="social-row__actions">
                <button
                  className="primary-btn primary-btn--small"
                  onMouseEnter={playHover}
                  onClick={() => joinGame(game)}
                  disabled={game.status !== 'waiting' || game.playerIds.length >= game.maxPlayers}
                >
                  Rejoindre
                </button>
                <button
                  className="ghost-btn ghost-btn--small"
                  onMouseEnter={playHover}
                  onClick={() => spectateGame(game)}
                >
                  👁 Regarder
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
