import { useEffect, useState } from 'react';
import { PlayMenu } from '../lobby/PlayMenu';
import { GameTable } from '../game/GameTable';

interface GamesPageProps {
  onBack: () => void;
  onRoomStateChange?: (active: boolean) => void;
}

interface ActiveRoom {
  gameId: string;
  spectate: boolean;
}

export function GamesPage({ onBack, onRoomStateChange }: GamesPageProps) {
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);

  useEffect(() => {
    onRoomStateChange?.(Boolean(activeRoom));
  }, [activeRoom, onRoomStateChange]);

  if (activeRoom) {
    return (
      <GameTable
        gameId={activeRoom.gameId}
        roomLabel={activeRoom.gameId.slice(0, 8)}
        isSpectator={activeRoom.spectate}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return (
    <PlayMenu
      onBack={onBack}
      onEnterRoom={(gameId, options) => setActiveRoom({ gameId, spectate: !!options?.spectate })}
    />
  );
}
