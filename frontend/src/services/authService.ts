import { ACTIVE_ROOM_KEY, API_URL, authApi, AuthResponse, TOKEN_KEY } from './api';
import { disconnectSockets } from './socket';

export type { AuthResponse };

export const authService = {
  register: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    const data = await authApi.register(email, username, password);
    sessionStorage.setItem(TOKEN_KEY, data.access_token);
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
    return data;
  },

  // Redirige vers le flux OAuth 42 (le backend gère l'échange du code puis
  // renvoie l'utilisateur vers /auth/callback?token=... côté frontend).
  redirectToFortyTwoLogin: () => {
    window.location.href = `${API_URL}/auth/42`;
  },

  // Appelé sur la page /auth/callback avec le token présent dans l'URL.
  completeFortyTwoLogin: (token: string) => {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await authApi.login(email, password);
    sessionStorage.setItem(TOKEN_KEY, data.access_token);
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
    return data;
  },

  getMe: async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('No token');
    return authApi.getMe();
  },

  logout: () => {
    disconnectSockets();
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ACTIVE_ROOM_KEY);
  },

  getToken: () => sessionStorage.getItem(TOKEN_KEY),
};
