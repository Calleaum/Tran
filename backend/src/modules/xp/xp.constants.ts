// Barème d'XP par titre de fin de partie.
// Une partie jouée rapporte toujours au moins 100 XP (participation),
// peu importe le résultat. Les titres "milieu de tableau" (Vice-président,
// Neutre) rapportent plus car ils demandent d'avoir bien joué sans finir
// dernier ; le Trou du cul et le Vice-trou du cul ne touchent que le
// forfait de participation.
export const XP_BY_TITLE: Record<string, number> = {
  Président: 300,
  'Vice-président': 200,
  Neutre: 150,
  'Vice-trou du cul': 100,
  'Trou du cul': 100,
};

// XP de base si jamais un joueur n'a aucun titre connu (ne devrait pas
// arriver en pratique, mais évite de perdre silencieusement un joueur).
export const XP_PARTICIPATION_DEFAULT = 100;

// Un palier tous les 1000 XP. Palier 1 = 0-999 XP, palier 2 = 1000-1999, etc.
export const LEVEL_XP_THRESHOLD = 1000;
