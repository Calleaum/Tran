import { OptionsScreen } from '../lobby/OptionsScreen';

interface OptionsPageProps {
  onBack: () => void;
}

export function OptionsPage({ onBack }: OptionsPageProps) {
  return <OptionsScreen onBack={onBack} />;
}