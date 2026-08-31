// Modèle de carte et utilitaires pour le Jeu du Président.
// Ce fichier est indépendant du réseau : il peut être piloté en local
// (mode démo/solo) ou recevoir son état depuis le serveur via WebSocket.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface CardModel {
  id: string; // identifiant stable, ex: "hearts-10"
  suit: Suit;
  rank: number; // 3..15 (3=3 ... 13=K, 14=A, 15=2 -> la carte la plus forte au Président)
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_COLOR: Record<Suit, 'red' | 'black'> = {
  spades: 'black',
  clubs: 'black',
  hearts: 'red',
  diamonds: 'red',
};

const RANK_LABEL: Record<number, string> = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'V', 12: 'D', 13: 'R', 14: 'A', 15: '2',
};

export function rankLabel(rank: number): string {
  return RANK_LABEL[rank] ?? String(rank);
}

export function makeDeck(): CardModel[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  // Ordre naturel des rangs (3 la plus faible, 2 la plus forte)
  const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const deck: CardModel[] = [];
  for (const s of suits) {
    for (const r of ranks) {
      deck.push({ id: `${s}-${r}`, suit: s, rank: r });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Conversion avec les cartes du serveur ──────────────────────────────
// Le backend représente une carte par { rank: '3'…'2', suit }, l'UI par un
// rang numérique (3 la plus faible, 15 le "2"). Ces helpers font le pont.

export type ServerRank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface ServerCard {
  rank: ServerRank;
  suit: Suit;
}

const SERVER_RANK_TO_NUMBER: Record<ServerRank, number> = {
  '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14, '2': 15,
};

const NUMBER_TO_SERVER_RANK: Record<number, ServerRank> = Object.fromEntries(
  Object.entries(SERVER_RANK_TO_NUMBER).map(([rank, value]) => [value, rank as ServerRank]),
) as Record<number, ServerRank>;

export function fromServerCard(card: ServerCard): CardModel {
  const rank = SERVER_RANK_TO_NUMBER[card.rank];
  return { id: `${card.suit}-${rank}`, suit: card.suit, rank };
}

export function toServerCard(card: CardModel): ServerCard {
  return { rank: NUMBER_TO_SERVER_RANK[card.rank], suit: card.suit };
}
