export type AppRoute =
  | '/login'
  | '/register'
  | '/auth/callback'
  | '/home'
  | '/games'
  | '/social'
  | '/classement'
  | '/tournament'
  | '/options'
  | '/privacy'
  | '/terms';

export const APP_ROUTES = {
  login: '/login',
  register: '/register',
  authCallback: '/auth/callback',
  home: '/home',
  games: '/games',
  social: '/social',
  ranking: '/classement',
  tournament: '/tournament',
  options: '/options',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export const AUTH_ROUTES = new Set<AppRoute>([APP_ROUTES.login, APP_ROUTES.register]);

// Accessible que l'utilisateur soit connecté ou non, sans redirection.
// /auth/callback fait transiter le token OAuth 42 : il doit rester
// atteignable avant même que `user` soit chargé.
export const PUBLIC_ROUTES = new Set<AppRoute>([
  APP_ROUTES.privacy,
  APP_ROUTES.terms,
  APP_ROUTES.authCallback,
]);

export const APP_ROUTES_SET = new Set<AppRoute>(Object.values(APP_ROUTES) as AppRoute[]);