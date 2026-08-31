import { useRef } from 'react';

/**
 * Chaque carte posée sur le tas reçoit une rotation et un petit décalage
 * aléatoires, générés UNE SEULE FOIS à sa création et mémorisés par id,
 * pour que la carte ne "saute" pas visuellement lors des re-renders.
 *
 * Si deux cartes sont posées en même temps (ex: une paire), chacune
 * obtient son propre tirage indépendant -> aucune des deux n'est droite.
 */
export interface ScatterStyle {
  rotate: number; // degrés, entre -18 et 18
  x: number; // décalage horizontal en px, entre -14 et 14
  y: number; // décalage vertical en px, entre -10 et 10
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function useCardScatter() {
  const cache = useRef<Map<string, ScatterStyle>>(new Map());

  function getScatter(cardId: string): ScatterStyle {
    const existing = cache.current.get(cardId);
    if (existing) return existing;

    const style: ScatterStyle = {
      rotate: randomBetween(-18, 18),
      x: randomBetween(-14, 14),
      y: randomBetween(-10, 10),
    };
    cache.current.set(cardId, style);
    return style;
  }

  function clear() {
    cache.current.clear();
  }

  return { getScatter, clear };
}
