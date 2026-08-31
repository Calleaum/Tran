// Types partagés par les écrans sociaux. Les données viennent toutes de
// l'API (`friendsService` / `playerService`) : ce fichier ne contient que
// le modèle et la traduction des statuts.

export interface SocialPlayer {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'in-game';
}

export const STATUS_LABEL: Record<SocialPlayer['status'], string> = {
  online: 'En ligne',
  offline: 'Hors ligne',
  'in-game': 'En partie',
};

/** Ligne renvoyée par `GET /friends`. */
export interface ApiFriend {
  friendshipId: string;
  id: string;
  username: string;
  avatar?: string | null;
  online: boolean;
  since: string;
}

/** Ligne renvoyée par `GET /friends/requests/{incoming,outgoing}`. */
export interface ApiFriendRequest {
  requestId: string;
  from?: { id: string; username: string; avatar?: string | null };
  to?: { id: string; username: string; avatar?: string | null };
  createdAt: string;
}

/** Ligne renvoyée par `GET /players`. */
export interface ApiPlayer {
  id: string;
  username: string;
  avatar?: string | null;
  wins: number;
  losses: number;
  xp: number;
  level: number;
}

export function friendToSocialPlayer(friend: ApiFriend): SocialPlayer {
  return { id: friend.id, name: friend.username, status: friend.online ? 'online' : 'offline' };
}

export function playerToSocialPlayer(player: { id: string; username: string }): SocialPlayer {
  return { id: player.id, name: player.username, status: 'offline' };
}
