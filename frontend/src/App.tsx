import { useEffect, useState } from 'react';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { authService } from './services/authService';
import { TOKEN_KEY } from './services/api';
import { FloatingCardsBackground } from './FloatingCardsBackground';
import { ChatProvider } from './chat/ChatContext';
import { ChatLauncher } from './chat/ChatLauncher';
import { playMusic, resumeMusicIfNeeded } from './sound';
import { APP_ROUTES, APP_ROUTES_SET, AUTH_ROUTES, AppRoute } from './routes';
import { HomePage } from './pages/Home';
import { GamesPage } from './pages/Games';
import { SocialPage } from './pages/Social';
import { ClassementPage } from './pages/Classement';
import { TournamentPage } from './pages/Tournament';
import { OptionsPage } from './pages/Options';
import './App.css';

interface AuthUser {
  id: string;
  email: string;
  username: string;
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

    const syncAuthState = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;
      void refreshUser();
    };

    window.addEventListener('storage', syncAuthState);
    return () => window.removeEventListener('storage', syncAuthState);
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

  const renderPage = () => {
    if (!user) {
      if (path === APP_ROUTES.register) {
        return (
          <Register
            onSuccess={handleLoginSuccess}
            onLoginClick={() => navigate(APP_ROUTES.login)}
          />
        );
      }

      return (
        <Login
          onSuccess={handleLoginSuccess}
          onRegisterClick={() => navigate(APP_ROUTES.register)}
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
        return <HomePage user={user} onNavigate={navigate} onLogout={handleLogout} />;
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