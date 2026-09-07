import { MainMenu } from '../lobby/MainMenu';
import { AppRoute } from '../routes';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
}

interface HomePageProps {
  user: AuthUser;
  onNavigate: (route: AppRoute) => void;
  onLogout: () => void;
  onAvatarChange: (avatar: string) => void;
}

export function HomePage({ user, onNavigate, onLogout, onAvatarChange }: HomePageProps) {
  return (
    <MainMenu
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
      onAvatarChange={onAvatarChange}
    />
  );
}
