// Résout la configuration CORS à partir de la variable d'env CORS_ORIGIN.
//
// - Si CORS_ORIGIN est défini (une origine, ou plusieurs séparées par des
//   virgules), seules celles-ci sont autorisées. Utile en prod pour
//   restreindre l'accès à un domaine précis.
// - Si CORS_ORIGIN n'est pas défini, on autorise dynamiquement l'origine de
//   chaque requête entrante (`origin: true`, cors reflète le header Origin).
//   C'est ce qui permet d'ouvrir le site depuis n'importe quelle IP du
//   réseau local (ex. https://192.168.1.42:3000) sans avoir à la connaître
//   à l'avance — cohérent avec le VITE_API_URL dynamique côté frontend.
//
// Utilisé à la fois par main.ts (REST) et par les gateways Socket.IO
// (GameGateway, ChatGateway) pour éviter de dupliquer cette logique.
export function resolveCorsOrigin(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return true;

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
