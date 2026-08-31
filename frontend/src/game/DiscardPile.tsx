import { CardModel } from './cards';
import { PlayingCard } from './PlayingCard';
import { useCardScatter } from './useCardScatter';

interface DiscardPileProps {
  // Historique des coups: chaque entrée est le paquet de cartes posées
  // en une seule fois (1 carte, ou plusieurs si carré/paire jouée ensemble).
  plays: CardModel[][];
}

// Nombre de coups précédents qu'on affiche encore "en dessous" du dernier,
// pour donner de la profondeur au tas sans afficher 50 cartes empilées.
const VISIBLE_HISTORY = 6;

export function DiscardPile({ plays }: DiscardPileProps) {
  const { getScatter } = useCardScatter();

  const visiblePlays = plays.slice(-VISIBLE_HISTORY);
  const baseIndex = plays.length - visiblePlays.length;

  if (plays.length === 0) {
    return (
      <div className="discard-pile discard-pile--empty">
        <span className="discard-pile__hint">Le tas est vide</span>
      </div>
    );
  }

  return (
    <div className="discard-pile">
      {visiblePlays.map((play, playIdx) => {
        const globalPlayIdx = baseIndex + playIdx;
        const isLatest = playIdx === visiblePlays.length - 1;
        // Léger fondu / retrait pour les coups plus anciens
        const depthFade = 1 - (visiblePlays.length - 1 - playIdx) * 0.06;

        return (
          <div
            key={globalPlayIdx}
            className={`discard-pile__play${isLatest ? ' discard-pile__play--latest' : ''}`}
            style={{ opacity: Math.max(depthFade, 0.55), zIndex: globalPlayIdx }}
          >
            {play.map((card, cardIdx) => {
              const scatter = getScatter(card.id);
              // Si plusieurs cartes posées ensemble, on les étale légèrement
              // en plus de leur rotation propre pour bien les distinguer.
              const spread = (cardIdx - (play.length - 1) / 2) * 30;
              return (
                <PlayingCard
                  key={card.id}
                  card={card}
                  large
                  style={{
                    transform: `translate(-50%, -50%) translate(${scatter.x + spread}px, ${scatter.y}px) rotate(${scatter.rotate}deg)`,
                  }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
