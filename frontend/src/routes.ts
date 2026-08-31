export type AppRoute =
  | '/login'
  | '/register'
  | '/home'
  | '/games'
  | '/social'
  | '/classement'
  | '/tournament'
  | '/options';

export const APP_ROUTES = {
  login: '/login',
  register: '/register',
  home: '/home',
  games: '/games',
  social: '/social',
  ranking: '/classement',
  tournament: '/tournament',
  options: '/options',
} as const;

export const AUTH_ROUTES = new Set<AppRoute>([APP_ROUTES.login, APP_ROUTES.register]);

export const APP_ROUTES_SET = new Set<AppRoute>(Object.values(APP_ROUTES) as AppRoute[]);