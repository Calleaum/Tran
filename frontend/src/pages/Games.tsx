import { useEffect, useState } from 'react';
import { PlayMenu } from '../lobby/PlayMenu';
import { GameTable } from '../game/GameTable';
import { ACTIVE_ROOM_KEY } from '../services/api';

interface GamesPageProps {
  onBack: () => void;
  onRoomStateChange?: (active: boolean) => void;
}

interface ActiveRoom {
  gameId: string;
  spectate: boolean;
}

// Persisté en sessionStorage (comme le JWT, voir services/socket.ts) pour
// survivre à un F5 : sans ça, un rechargement de page perdait cet état
// React et renvoyait l'utilisateur au menu "Jouer" alors même que le
// gateway (voir game.gateway.ts, délai de grâce sur la déconnexion) le
// gardait bien inscrit dans la partie côté serveur. Scope par onglet, donc
// pas de fuite d'un salon vers un autre onglet — mais PAS entre deux
// comptes utilisés successivement dans le même onglet : c'est
// authService (login/register/logout) qui est responsable de vider cette
// clé à chaque changement de session, voir services/authService.ts.

function readStoredRoom(): ActiveRoom | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_ROOM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.gameId === 'string') {
      return { gameId: parsed.gameId, spectate: Boolean(parsed.spectate) };
    }
  } catch {
    // ignore
  }
  return null;
}

export function GamesPage({ onBack, onRoomStateChange }: GamesPageProps) {
  const [activeRoom, setActiveRoomState] = useState<ActiveRoom | null>(readStoredRoom);
  // Message affiché sur le menu "Jouer" quand on en revient suite à un
  // échec (ex : salon restauré depuis une session précédente qui n'existe
  // plus) plutôt qu'un départ volontaire.
  const [roomError, setRoomError] = useState<string | null>(null);

  const setActiveRoom = (room: ActiveRoom | null) => {
    setActiveRoomState(room);
    try {
      if (room) sessionStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(room));
      else sessionStorage.removeItem(ACTIVE_ROOM_KEY);
    } catch {
      // ignore (mode privé strict, quota, etc.)
    }
  };

  useEffect(() => {
    onRoomStateChange?.(Boolean(activeRoom));
  }, [activeRoom, onRoomStateChange]);

  if (activeRoom) {
    return (
      <GameTable
        gameId={activeRoom.gameId}
        roomLabel={activeRoom.gameId.slice(0, 8)}
        isSpectator={activeRoom.spectate}
        onLeave={(reason) => {
          setRoomError(reason ?? null);
          setActiveRoom(null);
        }}
      />
    );
  }

  return (
    <PlayMenu
      onBack={onBack}
      initialError={roomError}
      onEnterRoom={(gameId, options) => {
        setRoomError(null);
        setActiveRoom({ gameId, spectate: !!options?.spectate });
      }}
    />
  );
}
