import { useState } from 'react';
import { OptionsScreen } from '../lobby/OptionsScreen';
import { playClick, playHover } from '../sound';

interface GameMenuOverlayProps {
  onClose: () => void;
  onLeaveGame: () => void;
}

/**
 * Menu qui s'ouvre par-dessus la table de jeu (le jeu continue derrière,
 * flouté). Remplace l'ancien bouton direct "Quitter la partie" : on passe
 * maintenant par ce menu pour quitter, ou pour accéder aux mêmes options
 * que celles du menu principal, sans perdre sa place dans la partie.
 */
export function GameMenuOverlay({ onClose, onLeaveGame }: GameMenuOverlayProps) {
  const [view, setView] = useState<'menu' | 'options'>('menu');

  return (
    <div className="game-menu-overlay" role="dialog" aria-modal="true" aria-label="Menu de partie">
      <div className="game-menu-overlay__backdrop" onClick={() => { playClick(); onClose(); }} />
      <div className="game-menu-overlay__panel">
        {view === 'menu' ? (
          <>
            <h2 className="game-menu-overlay__title">Menu de partie</h2>
            <div className="game-menu-overlay__actions">
              <button
                className="primary-btn"
                onMouseEnter={playHover}
                onClick={() => { playClick(); onClose(); }}
              >
                ▶ Reprendre la partie
              </button>
              <button
                className="ghost-btn"
                onMouseEnter={playHover}
                onClick={() => { playClick(); setView('options'); }}
              >
                ⚙ Options
              </button>
              <button
                className="ghost-btn game-menu-overlay__leave"
                onMouseEnter={playHover}
                onClick={() => { playClick(); onLeaveGame(); }}
              >
                ← Quitter la partie
              </button>
            </div>
          </>
        ) : (
          <OptionsScreen onBack={() => setView('menu')} />
        )}
      </div>
    </div>
  );
}
