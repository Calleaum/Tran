import { TournamentScreen } from '../lobby/TournamentScreen';

interface TournamentPageProps {
  onBack: () => void;
}

export function TournamentPage({ onBack }: TournamentPageProps) {
  return <TournamentScreen onBack={onBack} />;
}