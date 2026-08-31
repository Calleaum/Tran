import { useState } from 'react';
import { ChatPanel } from './ChatPanel';
import { playClick, playHover } from '../sound';

/**
 * Bulle de chat flottante visible sur tous les écrans du menu (lobby).
 * Ouvre le même ChatPanel que celui utilisé en jeu, en version fenêtre
 * flottante plutôt qu'ancrée.
 */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <div className="chat-launcher">
      {open && (
        <div className="chat-launcher__panel">
          <ChatPanel variant="lobby" onClose={() => setOpen(false)} />
        </div>
      )}
      <button
        className={`chat-launcher__btn${open ? ' chat-launcher__btn--active' : ''}`}
        onMouseEnter={playHover}
        onClick={() => { playClick(); setOpen((v) => !v); }}
        aria-label="Ouvrir le chat"
      >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 3.5C6.75 3.5 2.5 6.96 2.5 11.25c0 2.44 1.37 4.62 3.5 6.05-.1.98-.45 2.14-1.24 3.2a.5.5 0 0 0 .55.78c1.75-.5 3.02-1.28 3.86-1.93.9.25 1.86.4 2.83.4 5.25 0 9.5-3.46 9.5-7.5S17.25 3.5 12 3.5Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
