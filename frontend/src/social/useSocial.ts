// Source unique des données sociales (amis, demandes, blocages, joueurs à
// ajouter). Tout vient du backend : `GET /friends*` et `GET /players`.
// Le hook recharge après chaque action pour rester aligné avec le serveur.

import { useCallback, useEffect, useState } from 'react';
import { friendsService, playerService } from '../services/api';
import {
  ApiFriend,
  ApiFriendRequest,
  ApiPlayer,
  SocialPlayer,
  friendToSocialPlayer,
  playerToSocialPlayer,
} from './socialData';

export interface SocialState {
  friends: SocialPlayer[];
  incoming: { requestId: string; player: SocialPlayer }[];
  outgoing: { requestId: string; player: SocialPlayer }[];
  blocked: SocialPlayer[];
  /** Joueurs inscrits qui ne sont ni moi, ni déjà amis, ni bloqués, ni en attente. */
  suggestions: SocialPlayer[];
  loading: boolean;
  error: string | null;
}

const EMPTY: SocialState = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  suggestions: [],
  loading: true,
  error: null,
};

function errorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string | string[] } } };
  const message = anyErr?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return 'Impossible de contacter le serveur.';
}

export function useSocial(myId: string) {
  const [state, setState] = useState<SocialState>(EMPTY);

  const reload = useCallback(async () => {
    try {
      const [friendsRaw, incomingRaw, outgoingRaw, blockedRaw, playersRaw] = await Promise.all([
        friendsService.list() as Promise<ApiFriend[]>,
        friendsService.incomingRequests() as Promise<ApiFriendRequest[]>,
        friendsService.outgoingRequests() as Promise<ApiFriendRequest[]>,
        friendsService.blocked() as Promise<{ id: string; username: string; avatar?: string | null }[]>,
        playerService.getAll() as Promise<ApiPlayer[]>,
      ]);

      const friends = friendsRaw.map(friendToSocialPlayer);
      const incoming = incomingRaw.map((r) => ({
        requestId: r.requestId,
        player: playerToSocialPlayer(r.from!),
      }));
      const outgoing = outgoingRaw.map((r) => ({
        requestId: r.requestId,
        player: playerToSocialPlayer(r.to!),
      }));
      const blocked = blockedRaw.map(playerToSocialPlayer);

      const known = new Set<string>([
        myId,
        ...friends.map((f) => f.id),
        ...blocked.map((b) => b.id),
        ...incoming.map((r) => r.player.id),
        ...outgoing.map((r) => r.player.id),
      ]);
      const suggestions = playersRaw
        .filter((p) => !known.has(p.id))
        .map(playerToSocialPlayer);

      setState({ friends, incoming, outgoing, blocked, suggestions, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: errorMessage(err) }));
    }
  }, [myId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Enveloppe commune : exécute l'appel API puis resynchronise depuis le
  // serveur, et remonte l'erreur dans l'état plutôt que de la laisser filer.
  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        await reload();
        return true;
      } catch (err) {
        setState((prev) => ({ ...prev, error: errorMessage(err) }));
        return false;
      }
    },
    [reload],
  );

  const actions = {
    reload,
    sendRequest: (targetId: string) => run(() => friendsService.sendRequest(targetId)),
    acceptRequest: (requestId: string) => run(() => friendsService.accept(requestId)),
    declineRequest: (requestId: string) => run(() => friendsService.decline(requestId)),
    removeFriend: (friendId: string) => run(() => friendsService.remove(friendId)),
    block: (userId: string) => run(() => friendsService.block(userId)),
    unblock: (userId: string) => run(() => friendsService.unblock(userId)),
    clearError: () => setState((prev) => ({ ...prev, error: null })),
  };

  return { ...state, ...actions };
}

export type UseSocial = ReturnType<typeof useSocial>;
