import { CardModel, SUIT_COLOR, SUIT_SYMBOL, rankLabel } from './cards';
import { playHover } from '../sound';

interface PlayingCardProps {
  card: CardModel;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  small?: boolean;
  large?: boolean;
}

export function PlayingCard({
  card,
  selected,
  disabled,
  faceDown,
  onClick,
  style,
  small,
  large,
}: PlayingCardProps) {
  const color = SUIT_COLOR[card.suit];

  if (faceDown) {
    return (
      <div
        className={`pcard pcard--back${small ? ' pcard--small' : ''}${large ? ' pcard--large' : ''}`}
        style={style}
        aria-label="Carte face cachée"
      />
    );
  }

  return (
    <button
      type="button"
      className={[
        'pcard',
        color === 'red' ? 'pcard--red' : 'pcard--black',
        selected ? 'pcard--selected' : '',
        disabled ? 'pcard--disabled' : '',
        small ? 'pcard--small' : '',
        large ? 'pcard--large' : '',
      ].join(' ').trim()}
      style={style}
      onClick={onClick}
      onMouseEnter={() => { if (!disabled) playHover(); }}
      disabled={disabled && !onClick}
      aria-pressed={selected}
      aria-label={`${rankLabel(card.rank)} de ${card.suit}`}
    >
      <span className="pcard__corner pcard__corner--tl">
        <span className="pcard__rank">{rankLabel(card.rank)}</span>
        <span className="pcard__suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>
      <span className="pcard__pip">{SUIT_SYMBOL[card.suit]}</span>
      <span className="pcard__corner pcard__corner--br">
        <span className="pcard__rank">{rankLabel(card.rank)}</span>
        <span className="pcard__suit">{SUIT_SYMBOL[card.suit]}</span>
      </span>
    </button>
  );
}
