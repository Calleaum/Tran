// Client HTTP partagé vers le backend NestJS.
// Toutes les requêtes passent par cette instance axios : elle porte l'URL de
// base (VITE_API_URL) et injecte automatiquement le JWT stocké en sessionStorage.
// sessionStorage (contrairement à localStorage) est isolé par onglet : ça
// permet de se connecter avec 2 comptes différents dans 2 onglets du même
// navigateur, chacun gardant sa propre session.

import axios from 'axios';

// Si VITE_API_URL n'est pas fourni (cas par défaut), on déduit l'URL de
// l'API à partir de l'origine utilisée par le navigateur pour charger la
// page. Comme nginx expose le frontend ET l'API sur le même host:port,
// ça fonctionne aussi bien depuis https://localhost:3000 que depuis
// https://<IP_LAN>:3000 — sans avoir à figer une IP en dur au build.
export const API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export const TOKEN_KEY = 'token';

// Salon de partie actif (voir pages/Games.tsx). Doit être nettoyé partout où
// TOKEN_KEY l'est (déconnexion, changement de compte) : sinon un gameId
// d'un compte/session précédent reste en sessionStorage et est restauré
// tel quel après une reconnexion (typiquement via l'OAuth 42, qui reste
// dans le même onglet le temps de la redirection) → l'appli tente de
// rejoindre une partie qui n'existe plus ("Partie introuvable") sans
// pouvoir s'en sortir.
export const ACTIVE_ROOM_KEY = 'transcendence:active_room';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ─── Auth ──────────────────────────────────────────────────────────────── */

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

/**
 * L'avatar stocké côté back est soit une URL absolue (photo 42), soit un
 * chemin relatif renvoyé par l'upload (/uploads/avatars/xxx.jpg). Cette
 * fonction renvoie dans tous les cas une URL affichable telle quelle.
 */
export function resolveAvatarUrl(avatar?: string | null): string | undefined {
  if (!avatar) return undefined;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
  return `${API_URL}${avatar}`;
}

export const authApi = {
  register: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', { email, username, password });
    return data;
  },
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    return data;
  },
  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

/* ─── Joueurs ───────────────────────────────────────────────────────────── */

export const playerService = {
  getAll: async () => (await api.get('/players')).data,
  getLeaderboard: async () => (await api.get('/players/leaderboard')).data,
  getOne: async (id: string) => (await api.get(`/players/${id}`)).data,
  getStats: async (id: string) => (await api.get(`/players/${id}/stats`)).data,
  updateProfile: async (id: string, payload: { username?: string; avatar?: string }) =>
    (await api.patch(`/players/${id}`, payload)).data,
  uploadAvatar: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return (
      await api.post(`/players/${id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },
};

/* ─── XP / niveaux ──────────────────────────────────────────────────────── */

export const xpService = {
  getMine: async () => (await api.get('/xp/me')).data,
  getOne: async (id: string) => (await api.get(`/xp/${id}`)).data,
  getLeaderboard: async () => (await api.get('/xp/leaderboard')).data,
};

/* ─── Historique des parties ────────────────────────────────────────────── */

export const historyService = {
  getAll: async (page = 1, limit = 10) =>
    (await api.get('/history', { params: { page, limit } })).data,
  getMine: async (page = 1, limit = 10) =>
    (await api.get('/history/me', { params: { page, limit } })).data,
  getByPlayer: async (playerId: string, page = 1, limit = 10) =>
    (await api.get(`/history/player/${playerId}`, { params: { page, limit } })).data,
  getOne: async (id: string) => (await api.get(`/history/${id}`)).data,
};

/* ─── Amis / blocages ───────────────────────────────────────────────────── */

export const friendsService = {
  list: async () => (await api.get('/friends')).data,
  incomingRequests: async () => (await api.get('/friends/requests/incoming')).data,
  outgoingRequests: async () => (await api.get('/friends/requests/outgoing')).data,
  blocked: async () => (await api.get('/friends/blocked')).data,
  sendRequest: async (targetUserId: string) =>
    (await api.post('/friends/requests', { targetUserId })).data,
  accept: async (requestId: string) =>
    (await api.post(`/friends/requests/${requestId}/accept`)).data,
  decline: async (requestId: string) =>
    (await api.post(`/friends/requests/${requestId}/decline`)).data,
  remove: async (friendId: string) => (await api.delete(`/friends/${friendId}`)).data,
  block: async (userId: string) => (await api.post(`/friends/${userId}/block`)).data,
  unblock: async (userId: string) => (await api.post(`/friends/${userId}/unblock`)).data,
};

/* ─── Chat (historique REST ; le temps réel passe par le socket) ─────────── */

export const chatService = {
  conversations: async () => (await api.get('/chat/conversations')).data,
  messages: async (otherUserId: string, limit = 50, before?: string) =>
    (await api.get(`/chat/conversations/${otherUserId}/messages`, { params: { limit, before } }))
      .data,
  markAsRead: async (otherUserId: string) =>
    (await api.post(`/chat/conversations/${otherUserId}/read`)).data,
  unreadCount: async () => (await api.get('/chat/unread-count')).data,
};

/* ─── Parties de Président ──────────────────────────────────────────────── */

export const presidentService = {
  getAll: async () => (await api.get('/president')).data,
  getMine: async () => (await api.get('/president/me')).data,
  getOne: async (id: string) => (await api.get(`/president/${id}`)).data,
  getState: async (id: string) => (await api.get(`/president/${id}/state`)).data,
  create: async (name?: string) => (await api.post('/president', name ? { name } : {})).data,
  join: async (id: string) => (await api.post(`/president/${id}/join`)).data,
  start: async (id: string) => (await api.patch(`/president/${id}/start`)).data,
  finish: async (id: string) => (await api.patch(`/president/${id}/finish`)).data,
};
