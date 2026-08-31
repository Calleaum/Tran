import { SocialScreen } from '../lobby/SocialScreen';

interface AuthUser {
  id: string;
  email: string;
  username: string;
}

interface SocialPageProps {
  user: AuthUser;
  onBack: () => void;
}

export function SocialPage({ user, onBack }: SocialPageProps) {
  return <SocialScreen user={user} onBack={onBack} />;
}