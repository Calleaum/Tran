import { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { authService } from './services/authService';
import { FloatingCardsBackground } from './FloatingCardsBackground';
import { ChatProvider } from './chat/ChatContext';
import { ChatLauncher } from './chat/ChatLauncher';
import { playMusic, resumeMusicIfNeeded } from './sound';
import { APP_ROUTES, APP_ROUTES_SET, AUTH_ROUTES, PUBLIC_ROUTES, AppRoute } from './routes';
import { HomePage } from './pages/Home';
import { GamesPage } from './pages/Games';
import { SocialPage } from './pages/Social';
import { ClassementPage } from './pages/Classement';
import { TournamentPage } from './pages/Tournament';
import { OptionsPage } from './pages/Options';
import { PrivacyPage } from './pages/Privacy';
import { TermsPage } from './pages/Terms';
import './styles/base.css';
import './styles/buttons.css';
import './styles/menu.css';
import './styles/submenu.css';
import './styles/game.css';
import './styles/tournament.css';
import './styles/roles-panel.css';
import './styles/options.css';
import './styles/social.css';
import './styles/chat.css';
import './styles/game-menu-overlay.css';
import './styles/floating-cards-bg.css';
import './styles/hub.css';
import './styles/modals.css';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
}

function App() {
  const [path, setPath] = useState<AppRoute | '/'>((window.location.pathname as AppRoute | '/') || '/');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [gamesInRoom, setGamesInRoom] = useState(false);

  const refreshUser = async () => {
    if (!authService.getToken()) {
      setUser(null);
      return null;
    }

    try {
      const userData = await authService.getMe();
      setUser(userData);
      return userData;
    } catch {
      authService.logout();
      setUser(null);
      return null;
    }
  };

  const navigate = (nextPath: AppRoute, replace = false) => {
    if (window.location.pathname === nextPath) {
      setPath(nextPath);
      return;
    }

    if (replace) {
      window.history.replaceState({}, '', nextPath);
    } else {
      window.history.pushState({}, '', nextPath);
    }

    setPath(nextPath);
  };

  useEffect(() => {
    const fetchUser = async () => {
      await refreshUser();
      setLoading(false);
    };

    void fetchUser();
    // Note : le token est en sessionStorage (isolé par onglet), donc pas de
    // synchronisation cross-onglets ici — chaque onglet garde sa propre
    // session, ce qui permet de se connecter avec 2 comptes différents.
  }, []);

  useEffect(() => {
    const syncPath = () => setPath((window.location.pathname as AppRoute | '/') || '/');
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentPath = path;
    const isAuthed = Boolean(user);

    if (currentPath === '/') {
      navigate(isAuthed ? APP_ROUTES.home : APP_ROUTES.login, true);
      return;
    }

    if (!APP_ROUTES_SET.has(currentPath as AppRoute)) {
      navigate(isAuthed ? APP_ROUTES.home : APP_ROUTES.login, true);
      return;
    }

    if (PUBLIC_ROUTES.has(currentPath as AppRoute)) {
      return;
    }

    if (!isAuthed && !AUTH_ROUTES.has(currentPath as AppRoute)) {
      navigate(APP_ROUTES.login, true);
      return;
    }

    if (isAuthed && AUTH_ROUTES.has(currentPath as AppRoute)) {
      navigate(APP_ROUTES.home, true);
    }
  }, [loading, user, path]);

  useEffect(() => {
    if (path !== APP_ROUTES.games) {
      setGamesInRoom(false);
    }
  }, [path]);

  useEffect(() => {
    playMusic(gamesInRoom ? 'game' : 'menu');
  }, [gamesInRoom]);

  useEffect(() => {
    const resume = () => resumeMusicIfNeeded();
    window.addEventListener('click', resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.removeEventListener('click', resume);
      window.removeEventListener('keydown', resume);
    };
  }, []);

  const handleLoginSuccess = async (_userData: AuthUser) => {
    await refreshUser();
    navigate(APP_ROUTES.home, true);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    navigate(APP_ROUTES.login, true);
  };

  // Mise à jour optimiste après upload d'un avatar (ProfileHub), pour éviter
  // un aller-retour réseau juste pour rafraîchir l'affichage.
  const handleAvatarChange = (avatar: string) => {
    setUser((prev) => (prev ? { ...prev, avatar } : prev));
  };

  const renderPage = () => {
    if (path === APP_ROUTES.privacy) {
      return <PrivacyPage onBack={() => navigate(user ? APP_ROUTES.home : APP_ROUTES.login)} />;
    }

    if (path === APP_ROUTES.terms) {
      return <TermsPage onBack={() => navigate(user ? APP_ROUTES.home : APP_ROUTES.login)} />;
    }

    if (path === APP_ROUTES.authCallback) {
      return (
        <AuthCallback
          onSuccess={() => {
            void refreshUser().then(() => navigate(APP_ROUTES.home, true));
          }}
          onFailure={() => navigate(APP_ROUTES.login, true)}
        />
      );
    }

    if (!user) {
      if (path === APP_ROUTES.register) {
        return (
          <Register
            onSuccess={handleLoginSuccess}
            onLoginClick={() => navigate(APP_ROUTES.login)}
            onPrivacyClick={() => navigate(APP_ROUTES.privacy)}
            onTermsClick={() => navigate(APP_ROUTES.terms)}
          />
        );
      }

      return (
        <Login
          onSuccess={handleLoginSuccess}
          onRegisterClick={() => navigate(APP_ROUTES.register)}
          onPrivacyClick={() => navigate(APP_ROUTES.privacy)}
          onTermsClick={() => navigate(APP_ROUTES.terms)}
        />
      );
    }

    switch (path) {
      case APP_ROUTES.games:
        return (
          <GamesPage
            onBack={() => navigate(APP_ROUTES.home)}
            onRoomStateChange={setGamesInRoom}
          />
        );
      case APP_ROUTES.social:
        return <SocialPage user={user} onBack={() => navigate(APP_ROUTES.home)} />;
      case APP_ROUTES.ranking:
        return <ClassementPage onBack={() => navigate(APP_ROUTES.home)} />;
      case APP_ROUTES.tournament:
        return <TournamentPage onBack={() => navigate(APP_ROUTES.home)} />;
      case APP_ROUTES.options:
        return <OptionsPage onBack={() => navigate(APP_ROUTES.home)} />;
      case APP_ROUTES.home:
      default:
        return (
          <HomePage
            user={user}
            onNavigate={navigate}
            onLogout={handleLogout}
            onAvatarChange={handleAvatarChange}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <span className="app-loading__suit">♠</span>
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <FloatingCardsBackground />
      {user ? (
        <ChatProvider user={user}>
          {renderPage()}
          {!gamesInRoom && <ChatLauncher />}
        </ChatProvider>
      ) : (
        renderPage()
      )}
    </>
  );
}

export default App;