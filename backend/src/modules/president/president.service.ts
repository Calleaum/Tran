import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PresidentGame,
  PresidentGameStatus,
  PresidentGameState,
  Card,
  CardTransfer,
} from 'src/entities/president-game.entity';
import { User } from 'src/entities/user.entity';
import { PresidentRulesService } from './president-rules.service';
import { GameHistoryService } from 'src/modules/history/game-history.service';
import { XpService } from 'src/modules/xp/xp.service';

@Injectable()
export class PresidentService {
  constructor(
    @InjectRepository(PresidentGame)
    private gameRepo: Repository<PresidentGame>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private rules: PresidentRulesService,
    private historyService: GameHistoryService,
    private xpService: XpService,
  ) {}

  // ─── CRUD basique ──────────────────────────────────────────────────────

  async create(creatorId: string, name?: string, maxPlayers?: number): Promise<PresidentGame> {
    const game = this.gameRepo.create({
      creatorId,
      name: name?.trim() || null,
      playerIds: [creatorId],
      status: PresidentGameStatus.WAITING,
      state: null,
      finalRankings: [],
      ...(maxPlayers ? { maxPlayers } : {}),
    });
    return this.gameRepo.save(game);
  }

  async findAll(): Promise<PresidentGame[]> {
    return this.gameRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<PresidentGame> {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) throw new NotFoundException('Partie introuvable');
    return game;
  }

  async findByUser(userId: string): Promise<PresidentGame[]> {
    // Filtre JSONB : playerIds contient userId
    return this.gameRepo
      .createQueryBuilder('g')
      .where(`g.playerIds @> :ids::jsonb`, { ids: JSON.stringify([userId]) })
      .orderBy('g.createdAt', 'DESC')
      .getMany();
  }

  // ─── Rejoindre / Quitter ───────────────────────────────────────────────

  async join(gameId: string, userId: string): Promise<PresidentGame> {
    const game = await this.findOne(gameId);

    if (game.status !== PresidentGameStatus.WAITING)
      throw new BadRequestException('La partie a déjà commencé');
    if (game.playerIds.includes(userId))
      throw new BadRequestException('Tu es déjà dans cette partie');
    if (game.playerIds.length >= game.maxPlayers)
      throw new BadRequestException(`La salle est pleine (max ${game.maxPlayers})`);

    game.playerIds = [...game.playerIds, userId];
    return this.gameRepo.save(game);
  }

  async leave(
    gameId: string,
    userId: string,
  ): Promise<{ game: PresidentGame; events: string[]; removed: boolean }> {
    const game = await this.findOne(gameId);
    const events: string[] = ['player_left'];

    if (game.status === PresidentGameStatus.WAITING) {
      if (!game.playerIds.includes(userId)) {
        return { game, events, removed: false };
      }

      game.playerIds = game.playerIds.filter((id) => id !== userId);
      if (game.creatorId === userId && game.playerIds.length > 0) {
        game.creatorId = game.playerIds[0];
      }
      if (game.playerIds.length === 0) {
        game.status = PresidentGameStatus.CANCELLED;
      }

      return { game: await this.gameRepo.save(game), events, removed: true };
    }

    if (game.status !== PresidentGameStatus.IN_PROGRESS || !game.state) {
      return { game, events, removed: false };
    }

    const state = this.requireState(game);
    const removedIndex = state.playerIds.indexOf(userId);
    if (removedIndex === -1) {
      return { game, events, removed: false };
    }

    state.playerIds = state.playerIds.filter((id) => id !== userId);
    delete state.hands[userId];
    state.rankings = state.rankings.filter((id) => id !== userId);
    state.passedPlayers = state.passedPlayers.filter((id) => id !== userId);

    if (state.playerIds.length <= 1) {
      if (state.playerIds.length === 1 && !state.rankings.includes(state.playerIds[0])) {
        state.rankings.push(state.playerIds[0]);
      }

      game.finalRankings = [...state.rankings];
      game.status = PresidentGameStatus.CANCELLED;
      game.state = {
        ...state,
        phase: 'finished',
        finalRankings: [...state.rankings],
      };

      return { game: await this.gameRepo.save(game), events, removed: true };
    }

    this.reseatTurnAfterLeave(state, removedIndex);
    game.state = state;

    return { game: await this.gameRepo.save(game), events, removed: true };
  }

  // ─── Démarrer la partie ────────────────────────────────────────────────

  async start(gameId: string, userId: string): Promise<PresidentGame> {
    const game = await this.findOne(gameId);

    if (game.creatorId !== userId) throw new ForbiddenException('Seul le créateur peut démarrer');
    if (game.status !== PresidentGameStatus.WAITING)
      throw new BadRequestException('Partie déjà démarrée');
    if (game.playerIds.length < game.minPlayers)
      throw new BadRequestException(`Il faut au moins ${game.minPlayers} joueurs`);

    const state = this.initState(game.playerIds);
    game.state = state;
    game.status = PresidentGameStatus.IN_PROGRESS;

    return this.gameRepo.save(game);
  }

  private initState(playerIds: string[]): PresidentGameState {
    const hands = this.rules.deal(playerIds);
    const firstPlayerId = this.rules.findFirstPlayer(playerIds, hands);
    const firstIndex = playerIds.indexOf(firstPlayerId);

    return {
      playerIds,
      hands,
      rankings: [],
      currentPile: null,
      lastPiles: [],
      passedPlayers: [],
      currentPlayerIndex: firstIndex,
      roundNumber: 1,
      phase: 'playing',
      exchangePending: null,
      roles: null,
      lastExchange: null,
      lastCompletedRound: null,
      finalRankings: [],
    };
  }

  // ─── Jouer des cartes ──────────────────────────────────────────────────

  async playCards(
    gameId: string,
    userId: string,
    cards: Card[],
  ): Promise<{
    game: PresidentGame;
    events: string[];
  }> {
    const game = await this.findOne(gameId);
    const state = this.requireState(game);
    const events: string[] = [];

    if (state.phase !== 'playing') throw new BadRequestException("Ce n'est pas le moment de jouer");

    const currentId = state.playerIds[state.currentPlayerIndex];
    if (currentId !== userId) throw new ForbiddenException("Ce n'est pas ton tour");

    // Vérifier que le joueur possède ces cartes
    const hand = state.hands[userId];
    for (const card of cards) {
      if (!hand.some((c) => this.rules.cardsMatch(c, card)))
        throw new BadRequestException(`Tu ne possèdes pas la carte ${card.rank}${card.suit}`);
    }

    // Valider le coup
    if (!this.rules.isValidPlay(cards, state.currentPile))
      throw new BadRequestException('Coup invalide');

    // Retirer les cartes de la main
    state.hands[userId] = this.rules.removeCardsFromHand(hand, cards);

    // Poser sur le pli
    state.currentPile = {
      cards,
      playedBy: userId,
      count: cards.length,
    };
    state.passedPlayers = [];

    events.push('cards_played');

    // Le joueur a vidé sa main → il est classé
    if (state.hands[userId].length === 0) {
      state.rankings.push(userId);
      events.push('player_finished');

      // Tous les joueurs sauf un ont fini → le dernier est con
      const remaining = state.playerIds.filter((id) => state.hands[id].length > 0);
      if (remaining.length <= 1) {
        if (remaining.length === 1) state.rankings.push(remaining[0]);
        return this.endRound(game, state, events);
      }
    }

    // Passer au prochain joueur actif.
    // Note : nextActivePlayer saute déjà les mains vides, donc si le joueur
    // vient de vider sa main il sera automatiquement ignoré pour la suite
    const next = this.nextPlayer(state);
    if (next === -1) {
      // Tous les joueurs restants ont passé → reset du pli
      state.lastPiles = [state.currentPile!, ...state.lastPiles].slice(0, 5);
      state.currentPile = null;
      state.passedPlayers = [];
      // Le prochain joueur actif après l'index courant
      state.currentPlayerIndex = this.rules.firstActivePlayerFrom(
        state.currentPlayerIndex,
        state.playerIds,
        state.hands,
      );
    } else {
      state.currentPlayerIndex = next;
    }

    game.state = state;
    await this.gameRepo.save(game);
    return { game, events };
  }

  // ─── Passer son tour ───────────────────────────────────────────────────

  async pass(
    gameId: string,
    userId: string,
  ): Promise<{
    game: PresidentGame;
    events: string[];
  }> {
    const game = await this.findOne(gameId);
    const state = this.requireState(game);
    const events: string[] = [];

    if (state.phase !== 'playing')
      throw new BadRequestException("Ce n'est pas le moment de passer");

    const currentId = state.playerIds[state.currentPlayerIndex];
    if (currentId !== userId) throw new ForbiddenException("Ce n'est pas ton tour");

    if (!state.currentPile)
      throw new BadRequestException('On ne peut pas passer quand le pli est vide');

    state.passedPlayers = [...state.passedPlayers, userId];
    events.push('player_passed');

    // Vérifier si le pli est terminé
    const pileOver = this.rules.isPileOver(
      state.playerIds,
      state.hands,
      state.passedPlayers,
      state.currentPile!.playedBy,
    );

    if (pileOver) {
      const winnerId = state.currentPile!.playedBy;
      state.lastPiles = [state.currentPile!, ...state.lastPiles].slice(0, 5);
      state.currentPile = null;
      state.passedPlayers = [];
      events.push('pile_won');

      // Si le gagnant du pli a vidé sa main entre-temps, on cherche
      // le prochain joueur actif à partir de sa position
      const winnerIndex = state.playerIds.indexOf(winnerId);
      if (state.hands[winnerId].length === 0) {
        // Chercher le premier joueur actif à partir du gagnant
        const nextIdx = this.rules.firstActivePlayerFrom(winnerIndex, state.playerIds, state.hands);
        state.currentPlayerIndex = nextIdx;
      } else {
        state.currentPlayerIndex = winnerIndex;
      }
    } else {
      state.currentPlayerIndex = this.nextPlayer(state);
    }

    game.state = state;
    await this.gameRepo.save(game);
    return { game, events };
  }

  // ─── Fin de manche ─────────────────────────────────────────────────────

  private async endRound(
    game: PresidentGame,
    state: PresidentGameState,
    events: string[],
  ): Promise<{ game: PresidentGame; events: string[] }> {
    events.push('round_ended');
    state.phase = 'round_end';

    const roles = this.rules.computeRoles(state.rankings);

    // Rôle de chaque joueur pour la manche à venir (affiché au front)
    const roleLabels = this.rules.getTitles(state.rankings);

    // On fige le résultat de la manche qui vient de se terminer AVANT de
    // vider `rankings` plus bas — c'est la seule trace qui survit si la
    // partie est arrêtée juste après (voir LastCompletedRound).
    state.lastCompletedRound = {
      roundNumber: state.roundNumber,
      rankings: [...state.rankings],
      titles: roleLabels,
    };

    // Classement (wins/losses) + XP mis à jour automatiquement à la fin de
    // CHAQUE manche, sans validation manuelle : dans une salle, on enchaîne
    // souvent plusieurs manches d'affilée, et on veut que chacune compte
    // pour le leaderboard, pas seulement quand quelqu'un clique un bouton
    // "terminer la partie" qui n'existe d'ailleurs pas côté front.
    await this.updateStats(state.lastCompletedRound.rankings, roleLabels);
    await this.xpService.awardForGame(roleLabels);

    // Nouvelle manche : on redistribue d'abord des mains fraîches
    let newHands = this.rules.deal(state.playerIds);
    const transfers: CardTransfer[] = [];

    // Puis on applique les échanges de cartes sur ces nouvelles mains :
    // le président donne ses 2 pires cartes au trou du cul, qui lui donne
    // ses 2 meilleures cartes. Pareil pour vice-président / vice-trou du
    // cul mais avec 1 seule carte (uniquement à partir de 4 joueurs).
    const presExchange = this.rules.applyCardExchange(
      newHands,
      roles.presidentId,
      roles.trouDuCulId,
      2,
    );
    newHands = presExchange.hands;
    transfers.push(...presExchange.transfers);

    if (roles.vicePresidentId && roles.viceTrouDuCulId) {
      const viceExchange = this.rules.applyCardExchange(
        newHands,
        roles.vicePresidentId,
        roles.viceTrouDuCulId,
        1,
      );
      newHands = viceExchange.hands;
      transfers.push(...viceExchange.transfers);
    }

    // Nouvelle manche
    state.roundNumber += 1;
    state.hands = newHands;
    state.rankings = [];
    state.currentPile = null;
    state.lastPiles = [];
    state.passedPlayers = [];
    state.phase = 'playing';
    state.roles = roleLabels;
    state.lastExchange = transfers;

    // Le trou du cul commence la prochaine manche
    state.currentPlayerIndex = state.playerIds.indexOf(roles.trouDuCulId);

    game.state = state;

    // Note : on ne met pas fin à la partie automatiquement
    // c'est au créateur de décider combien de manches jouer
    // (ou après N manches selon les règles de la salle)
    await this.gameRepo.save(game);
    return { game, events };
  }

  // ─── Terminer la partie manuellement (créateur) ────────────────────────

  async finish(gameId: string, userId: string): Promise<PresidentGame> {
    const game = await this.findOne(gameId);

    if (game.creatorId !== userId)
      throw new ForbiddenException('Seul le créateur peut terminer la partie');
    if (game.status !== PresidentGameStatus.IN_PROGRESS)
      throw new BadRequestException("La partie n'est pas en cours");

    const state = this.requireState(game);

    // `state.rankings` est vide à ce stade : une manche terminée déclenche
    // immédiatement la suivante (voir endRound), donc au moment où le
    // créateur clique "Terminer", la manche affichée est toujours en cours.
    // Le vrai résultat de la partie, c'est la dernière manche COMPLÈTE.
    const finalRankings = state.lastCompletedRound?.rankings ?? [];
    const roundsPlayed = state.lastCompletedRound?.roundNumber ?? 0;

    game.finalRankings = finalRankings;
    game.status = PresidentGameStatus.FINISHED;
    game.state = {
      ...state,
      phase: 'finished',
      finalRankings,
      roundNumber: roundsPlayed,
    };

    // Note : wins/losses et XP sont déjà appliqués manche par manche dans
    // `endRound()` (voir plus haut) — on ne les réapplique pas ici pour ne
    // pas compter deux fois la dernière manche jouée. `finish()` ne fait
    // plus que figer le statut de la salle et archiver la partie complète.
    const saved = await this.gameRepo.save(game);

    // Historique : capture immuable de la partie (idempotent, ne casse
    // jamais le flux de fin de partie même en cas de double appel)
    await this.historyService.recordGame(saved, {});

    return saved;
  }

  private async updateStats(rankings: string[], titles: Record<string, string>): Promise<void> {
    if (rankings.length === 0) return;
    // Président = victoire, Con = défaite, les autres = neutre
    const winnerId = rankings[0];
    const loserId = rankings[rankings.length - 1];
    await this.userRepo.increment({ id: winnerId }, 'wins', 1);
    await this.userRepo.increment({ id: loserId }, 'losses', 1);

    // Compteurs de titres (leaderboard) : un par manche terminée, quel
    // que soit le titre porté. Vice-président / Vice-trou du cul n'ont pas
    // de colonne dédiée : on les compte dans `neutralCount` (comme "Neutre")
    // via ce `else` général. C'est important : sans ça, ces joueurs ne
    // recevraient AUCUN compteur pour la manche et redeviendraient
    // indiscernables d'un joueur qui n'a jamais joué (0 victoire / 0
    // défaite / 0 neutre) dans le classement — cf. getLeaderboard().
    for (const [userId, title] of Object.entries(titles)) {
      if (title === 'Président') await this.userRepo.increment({ id: userId }, 'presidentCount', 1);
      else if (title === 'Trou du cul') await this.userRepo.increment({ id: userId }, 'trouducCount', 1);
      else await this.userRepo.increment({ id: userId }, 'neutralCount', 1);
    }
  }

  // ─── Vue publique (sans les mains des autres) ─────────────────────────

  getPublicState(state: PresidentGameState, forUserId: string): object {
    const { hands, ...publicState } = state;

    return {
      ...publicState,
      currentPlayerId: state.playerIds[state.currentPlayerIndex] ?? null,
      myHand: hands[forUserId] ?? [],
      handSizes: Object.fromEntries(Object.entries(hands).map(([id, cards]) => [id, cards.length])),
    };
  }

  getTitles(rankings: string[]): Record<string, string> {
    return this.rules.getTitles(rankings);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private requireState(game: PresidentGame): PresidentGameState {
    if (!game.state) throw new BadRequestException("La partie n'a pas encore commencé");
    return game.state;
  }

  private nextPlayer(state: PresidentGameState): number {
    return this.rules.nextActivePlayer(
      state.currentPlayerIndex,
      state.playerIds,
      state.hands,
      state.passedPlayers,
    );
  }

  private reseatTurnAfterLeave(state: PresidentGameState, removedIndex: number): void {
    const next = this.rules.nextActivePlayer(
      removedIndex - 1,
      state.playerIds,
      state.hands,
      state.passedPlayers,
    );

    if (next !== -1) {
      state.currentPlayerIndex = next;
      return;
    }

    if (state.currentPile) {
      state.lastPiles = [state.currentPile, ...state.lastPiles].slice(0, 5);
      state.currentPile = null;
      state.passedPlayers = [];
    }

    const fallback = this.rules.firstActivePlayerFrom(
      Math.max(0, removedIndex % state.playerIds.length),
      state.playerIds,
      state.hands,
    );
    state.currentPlayerIndex = fallback === -1 ? 0 : fallback;
  }
}
