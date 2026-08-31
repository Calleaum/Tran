import { authApi, AuthResponse, TOKEN_KEY } from './api';
import { disconnectSockets } from './socket';

export type { AuthResponse };

export const authService = {
  register: async (email: string, username: string, password: string): Promise<AuthResponse> => {
    const data = await authApi.register(email, username, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const data = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },

  getMe: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('No token');
    return authApi.getMe();
  },

  logout: () => {
    disconnectSockets();
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken: () => localStorage.getItem(TOKEN_KEY),
};
