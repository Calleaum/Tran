import { Injectable } from '@nestjs/common';
import { Card, Rank, Suit, Pile, CardTransfer } from 'src/entities/president-game.entity';

// ─── Ordre des rangs (3 = plus faible, 2 = plus fort)
const RANK_ORDER: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANK_ORDER.map((r, i) => [r, i]),
) as Record<Rank, number>;

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

@Injectable()
export class PresidentRulesService {
  // ─── Deck ──────────────────────────────────────────────────────────────

  buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const rank of RANK_ORDER) {
        deck.push({ rank, suit });
      }
    }
    return deck;
  }

  shuffle(deck: Card[]): Card[] {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  deal(playerIds: string[]): Record<string, Card[]> {
    const deck = this.shuffle(this.buildDeck());
    const hands: Record<string, Card[]> = {};
    for (const id of playerIds) hands[id] = [];

    deck.forEach((card, i) => {
      const playerId = playerIds[i % playerIds.length];
      hands[playerId].push(card);
    });

    // Trier les mains (3 → 2)
    for (const id of playerIds) {
      hands[id] = this.sortCards(hands[id]);
    }

    return hands;
  }

  sortCards(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => {
      const diff = RANK_VALUE[a.rank] - RANK_VALUE[b.rank];
      if (diff !== 0) return diff;
      return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    });
  }

  // ─── Validation d'un coup ──────────────────────────────────────────────

  /**
   * Vérifie si `cards` peut être joué sur `currentPile`.
   * Règles :
   * - Toutes les cartes doivent avoir le même rang
   * - Le nombre de cartes doit correspondre au pli courant (ou pli vide)
   * - Le rang doit être > au rang du pli courant
   * - Le 2 bat tout (valeur max)
   * - Carré de 2 = reset le pli (comme si la table était vide)
   */
  isValidPlay(cards: Card[], currentPile: Pile | null): boolean {
    if (cards.length === 0) return false;

    // Toutes les cartes même rang
    const rank = cards[0].rank;
    if (!cards.every((c) => c.rank === rank)) return false;

    if (!currentPile) {
      // Pli vide : n'importe quoi
      return true;
    }

    const pileRank = currentPile.cards[0].rank;
    const pileCount = currentPile.count;

    // Même nombre de cartes
    if (cards.length !== pileCount) return false;

    // Rang strictement supérieur
    return RANK_VALUE[rank] > RANK_VALUE[pileRank];
  }

  cardValue(card: Card): number {
    return RANK_VALUE[card.rank];
  }

  // ─── Vérifier si un joueur peut jouer ──────────────────────────────────

  canPlay(hand: Card[], currentPile: Pile | null): boolean {
    if (!currentPile) return hand.length > 0;
    const pileRank = currentPile.cards[0].rank;
    const pileCount = currentPile.count;
    // Peut-il poser `pileCount` cartes de rang supérieur ?
    const grouped = this.groupByRank(hand);
    return Object.entries(grouped).some(([rank, cards]) => {
      return RANK_VALUE[rank as Rank] > RANK_VALUE[pileRank] && cards.length >= pileCount;
    });
  }

  groupByRank(cards: Card[]): Record<string, Card[]> {
    const groups: Record<string, Card[]> = {};
    for (const card of cards) {
      if (!groups[card.rank]) groups[card.rank] = [];
      groups[card.rank].push(card);
    }
    return groups;
  }

  // ─── Qui commence (celui avec le 3 de trèfle, sinon le 3 de cœur) ─────

  findFirstPlayer(playerIds: string[], hands: Record<string, Card[]>): string {
    // Celui qui a le 3 de trèfle commence
    for (const id of playerIds) {
      if (hands[id].some((c) => c.rank === '3' && c.suit === 'clubs')) return id;
    }
    // Sinon celui avec le 3 de cœur
    for (const id of playerIds) {
      if (hands[id].some((c) => c.rank === '3' && c.suit === 'hearts')) return id;
    }
    // Fallback : premier joueur
    return playerIds[0];
  }

  // ─── Prochain joueur actif (qui n'a pas encore vidé sa main) ──────────

  nextActivePlayer(
    currentIndex: number,
    playerIds: string[],
    hands: Record<string, Card[]>,
    passedPlayers: string[],
  ): number {
    let idx = (currentIndex + 1) % playerIds.length;
    let loops = 0;
    while (loops < playerIds.length) {
      const pid = playerIds[idx];
      // Saute les joueurs qui ont fini (main vide) ou qui ont passé ce tour
      if (hands[pid].length > 0 && !passedPlayers.includes(pid)) return idx;
      idx = (idx + 1) % playerIds.length;
      loops++;
    }
    return -1; // Tous les joueurs actifs ont passé → reset du pli
  }

  // ─── Premier joueur actif à partir d'un index donné ───────────────────
  // Utilisé quand le gagnant du pli a la main vide

  firstActivePlayerFrom(
    startIndex: number,
    playerIds: string[],
    hands: Record<string, Card[]>,
  ): number {
    let idx = startIndex % playerIds.length;
    for (let loops = 0; loops < playerIds.length; loops++) {
      if (hands[playerIds[idx]].length > 0) return idx;
      idx = (idx + 1) % playerIds.length;
    }
    return -1; // Plus aucun joueur actif → fin de manche
  }

  // ─── Vérifier si le pli est terminé (tous les autres ont passé) ────────

  isPileOver(
    playerIds: string[],
    hands: Record<string, Card[]>,
    passedPlayers: string[],
    lastPlayerId: string,
  ): boolean {
    // Le pli est terminé si tous les joueurs avec des cartes (sauf le dernier
    // à avoir joué) ont passé. Les joueurs avec main vide sont ignorés.
    const activePlayers = playerIds.filter((id) => id !== lastPlayerId && hands[id].length > 0);
    return activePlayers.every((id) => passedPlayers.includes(id));
  }

  // ─── Retirer les cartes jouées de la main ─────────────────────────────

  removeCardsFromHand(hand: Card[], played: Card[]): Card[] {
    const remaining = [...hand];
    for (const card of played) {
      const idx = remaining.findIndex((c) => c.rank === card.rank && c.suit === card.suit);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining;
  }

  // ─── Vérifie si deux cartes sont identiques ───────────────────────────

  cardsMatch(a: Card, b: Card): boolean {
    return a.rank === b.rank && a.suit === b.suit;
  }

  // ─── Calcul de l'échange entre deux joueurs ────────────────────────────

  /**
   * Le joueur "haut" (président ou vice-président) donne ses `count` pires
   * cartes au joueur "bas" (trou du cul ou vice-trou du cul), qui lui donne
   * en retour ses `count` meilleures cartes.
   * Retourne les mains mises à jour.
   */
  applyCardExchange(
    hands: Record<string, Card[]>,
    highId: string,
    lowId: string,
    count: number,
  ): { hands: Record<string, Card[]>; transfers: CardTransfer[] } {
    const highHand = this.sortCards([...hands[highId]]);
    const lowHand = this.sortCards([...hands[lowId]]);

    // Le joueur du bas donne ses `count` meilleures cartes
    const lowGives = lowHand.slice(-count);
    // Le joueur du haut donne ses `count` pires cartes
    const highGives = highHand.slice(0, count);

    const newHighHand = this.sortCards([
      ...this.removeCardsFromHand(highHand, highGives),
      ...lowGives,
    ]);
    const newLowHand = this.sortCards([
      ...this.removeCardsFromHand(lowHand, lowGives),
      ...highGives,
    ]);

    return {
      hands: {
        ...hands,
        [highId]: newHighHand,
        [lowId]: newLowHand,
      },
      transfers: [
        { fromId: highId, toId: lowId, cards: highGives },
        { fromId: lowId, toId: highId, cards: lowGives },
      ],
    };
  }

  // ─── Rôles d'après le classement de la manche ──────────────────────────

  /**
   * Détermine les rôles (président, vice-président, vice-trou du cul, trou
   * du cul) à partir du classement d'arrivée d'une manche.
   * Les rôles "vice" n'existent qu'à partir de 4 joueurs.
   */
  computeRoles(rankings: string[]): {
    presidentId: string;
    vicePresidentId?: string;
    viceTrouDuCulId?: string;
    trouDuCulId: string;
  } {
    const n = rankings.length;
    const presidentId = rankings[0];
    const trouDuCulId = rankings[n - 1];

    if (n >= 4) {
      return {
        presidentId,
        vicePresidentId: rankings[1],
        viceTrouDuCulId: rankings[n - 2],
        trouDuCulId,
      };
    }
    return { presidentId, trouDuCulId };
  }

  /**
   * Attribue le titre de chaque joueur à partir du classement d'arrivée.
   * Exemple pour 5 joueurs : Président, Vice-président, Neutre,
   * Vice-trou du cul, Trou du cul.
   */
  getTitles(rankings: string[]): Record<string, string> {
    const n = rankings.length;
    const titles: Record<string, string> = {};

    rankings.forEach((id, i) => {
      if (i === 0) titles[id] = 'Président';
      else if (i === n - 1) titles[id] = 'Trou du cul';
      else if (n >= 4 && i === 1) titles[id] = 'Vice-président';
      else if (n >= 4 && i === n - 2) titles[id] = 'Vice-trou du cul';
      else titles[id] = 'Neutre';
    });

    return titles;
  }
}
