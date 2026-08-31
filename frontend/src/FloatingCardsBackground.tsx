import { useMemo } from 'react';
import { CardModel, SUIT_COLOR, SUIT_SYMBOL, rankLabel, makeDeck, shuffle } from './game/cards';

interface FloatingCardSpec {
  card: CardModel;
  startXVw: number; // position de départ en % de la largeur d'écran
  startYVh: number; // position de départ en % de la hauteur d'écran (négatif = au-dessus de l'écran)
  endXVw: number;
  endYVh: number;
  durationS: number;
  delayS: number;
  rotateStart: number;
  rotateEnd: number;
  scale: number;
}

const CARD_COUNT = 14;

/**
 * Génère des trajectoires allant toutes dans la même direction diagonale
 * (haut-gauche vers bas-droite), mais avec des points de départ répartis
 * sur TOUT le bord haut et TOUT le bord gauche de l'écran (toujours hors
 * champ), pas seulement dans le coin haut-gauche. Résultat : des cartes
 * traversent l'écran à toutes les hauteurs et toutes les largeurs, pas
 * uniquement le long d'une seule bande diagonale.
 */
function generateFloatingCards(count: number): FloatingCardSpec[] {
  const deck = shuffle(makeDeck());
  const specs: FloatingCardSpec[] = [];
  for (let i = 0; i < count; i++) {
    const card = deck[i % deck.length];

    // Distance parcourue (constante en direction, variable en amplitude)
    // pour que chaque carte traverse bien tout l'écran avant de sortir
    // en bas à droite.
    const travelX = 90 + Math.random() * 45; // 90vw à 135vw
    const travelY = 100 + Math.random() * 55; // 100vh à 155vh

    let startXVw: number;
    let startYVh: number;

    if (Math.random() < 0.5) {
      // Entrée par le bord du haut : dispersée sur toute la largeur
      // (et un peu au-delà), toujours au-dessus de l'écran.
      startXVw = -25 + Math.random() * 130; // -25% à 105%
      startYVh = -35 - Math.random() * 25; // -35% à -60%
    } else {
      // Entrée par le bord gauche : dispersée sur toute la hauteur
      // (et un peu au-delà), toujours à gauche de l'écran.
      startXVw = -35 - Math.random() * 25; // -35% à -60%
      startYVh = -25 + Math.random() * 130; // -25% à 105%
    }

    const endXVw = startXVw + travelX;
    const endYVh = startYVh + travelY;

    specs.push({
      card,
      startXVw,
      startYVh,
      endXVw,
      endYVh,
      durationS: 14 + Math.random() * 10, // 14s à 24s, assez lent pour rester discret
      delayS: -Math.random() * 24, // délai négatif : la carte démarre "en cours" dès le montage
      rotateStart: Math.random() * 360,
      rotateEnd: Math.random() * 360 + (Math.random() > 0.5 ? 360 : -360),
      scale: 0.55 + Math.random() * 0.35,
    });
  }
  return specs;
}

/** Carte purement décorative pour le fond animé : pas de bouton, pas d'écouteurs. */
function DecorativeCard({ card }: { card: CardModel }) {
  const color = SUIT_COLOR[card.suit];
  return (
    <div className={`floating-card ${color === 'red' ? 'floating-card--red' : 'floating-card--black'}`}>
      <span className="floating-card__corner floating-card__corner--tl">
        <span>{rankLabel(card.rank)}</span>
        <span>{SUIT_SYMBOL[card.suit]}</span>
      </span>
      <span className="floating-card__pip">{SUIT_SYMBOL[card.suit]}</span>
      <span className="floating-card__corner floating-card__corner--br">
        <span>{rankLabel(card.rank)}</span>
        <span>{SUIT_SYMBOL[card.suit]}</span>
      </span>
    </div>
  );
}

/**
 * Fond animé purement décoratif : quelques cartes défilent en continu en
 * diagonale (haut-gauche vers bas-droite) en tournant sur elles-mêmes à
 * vitesse et rotation aléatoires. Placé en position fixed derrière le
 * contenu réel (voir .floating-cards-bg en CSS, z-index négatif).
 */
export function FloatingCardsBackground() {
  // Générées une seule fois par montage du composant, jamais recalculées
  // au fil des re-renders parents (évite les sauts visuels).
  const specs = useMemo(() => generateFloatingCards(CARD_COUNT), []);

  return (
    <div className="floating-cards-bg" aria-hidden="true">
      {specs.map((spec, i) => (
        <div
          key={i}
          className="floating-cards-bg__item"
          style={{
            ['--start-x' as any]: `${spec.startXVw}vw`,
            ['--start-y' as any]: `${spec.startYVh}vh`,
            ['--end-x' as any]: `${spec.endXVw}vw`,
            ['--end-y' as any]: `${spec.endYVh}vh`,
            ['--rotate-start' as any]: `${spec.rotateStart}deg`,
            ['--rotate-end' as any]: `${spec.rotateEnd}deg`,
            ['--scale' as any]: spec.scale,
            animationDuration: `${spec.durationS}s`,
            animationDelay: `${spec.delayS}s`,
          }}
        >
          <DecorativeCard card={spec.card} />
        </div>
      ))}
    </div>
  );
}
