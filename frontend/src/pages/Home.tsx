import { MainMenu } from '../lobby/MainMenu';
import { AppRoute } from '../routes';

interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface HomePageProps {
  user: AuthUser;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
}

export function HomePage({ user, onNavigate, onLogout }: HomePageProps) {
  return <MainMenu user={user} onNavigate={onNavigate} onLogout={onLogout} />;
}