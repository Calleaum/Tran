import { RankingScreen } from '../lobby/RankingScreen';

interface ClassementPageProps {
  onBack: () => void;
}

export function ClassementPage({ onBack }: ClassementPageProps) {
  return <RankingScreen onBack={onBack} />;
}