import { useState } from 'react';
import { playHover, playClick } from '../sound';
import { ChatPanel } from '../chat/ChatPanel';
import { QuestPanel } from './QuestPanel';
import { ProfileHub } from './ProfileHub';
import { FriendsPanel } from './FriendsPanel';
import { useSocial } from '../social/useSocial';
import { useChat } from '../chat/ChatContext';
import { APP_ROUTES, AppRoute } from '../routes';

interface MainMenuProps {
  user: { id: string; username: string };
  onNavigate: (dest: AppRoute) => void;
  onLogout: () => void;
}

export function MainMenu({ user, onNavigate, onLogout }: MainMenuProps) {
  const social = useSocial(user.id);
  const { isOnline } = useChat();
  const [chatFocus, setChatFocus] = useState<string | null>(null);

  // Même source que l'écran Social (`GET /friends`), avec la présence
  // temps réel reçue par le socket appliquée par-dessus.
  const friends = social.friends.map((f) => ({
    ...f,
    status: isOnline(f.id) || f.status === 'online' ? ('online' as const) : ('offline' as const),
  }));

  return (
    <div className="menu-screen menu-screen--hub">
      <div className="menu-topbar">
        <div className="menu-brand">
          <span className="menu-brand__suit">♠♥♣♦</span>
          <span className="menu-brand__title">Le Jeu du Président</span>
        </div>

        <nav className="menu-tabs">
          <button className="menu-tab menu-tab--active" onMouseEnter={playHover} disabled>
            Accueil
          </button>
          <button className="menu-tab" onMouseEnter={playHover} onClick={() => { playClick(); onNavigate(APP_ROUTES.tournament); }}>
            Tournois
          </button>
          <button className="menu-tab" onMouseEnter={playHover} onClick={() => { playClick(); onNavigate(APP_ROUTES.ranking); }}>
            Classement
          </button>
        </nav>

        <div className="menu-account">
          <button className="ghost-btn ghost-btn--small" onMouseEnter={playHover} onClick={() => { playClick(); onNavigate(APP_ROUTES.options); }}>
            ⚙
          </button>
          <span>Connecté : <strong>{user.username}</strong></span>
          <button className="ghost-btn" onMouseEnter={playHover} onClick={onLogout}>Déconnexion</button>
        </div>
      </div>

      <div className="menu-hub">
        <div className="menu-hub__left">
          <ChatPanel variant="game" focusPeerId={chatFocus} />
        </div>

        <div className="menu-hub__center">
          <QuestPanel />
          <ProfileHub username={user.username} />
        </div>

        <div className="menu-hub__right">
          <FriendsPanel
            friends={friends}
            loading={social.loading}
            onOpenSocial={() => onNavigate(APP_ROUTES.social)}
            onOpenChatWith={(peerId) => setChatFocus(peerId)}
          />

          <button
            className="play-cta"
            onMouseEnter={playHover}
            onClick={() => { playClick(); onNavigate(APP_ROUTES.games); }}
          >
            <span className="play-cta__icon">♠</span>
            <span className="play-cta__label">Jouer</span>
          </button>
        </div>
      </div>
    </div>
  );
}
