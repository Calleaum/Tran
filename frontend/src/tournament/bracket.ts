// Générateur et moteur de bracket pour le tournoi du Président.
// Contrairement à un bracket classique (duels 1v1), chaque "table" regroupe
// plusieurs joueurs et environ la moitié se qualifie pour le tour suivant.
// Les non-qualifiés d'un tour se retrouvent entre eux sur des tables de
// repêchage ("bracket des perdants").

export interface TournamentPlayer {
  id: string;
  name: string;
}

export interface TournamentSeat {
  player: TournamentPlayer | null; // null tant que la place n'est pas connue
}

export interface TournamentTable {
  id: string;
  roundIndex: number;
  tableIndex: number;
  bracket: 'winners' | 'losers';
  seats: TournamentSeat[];
  qualifiedCount: number; // combien de cette table montent au tour suivant (0 pour "losers")
  results: TournamentPlayer[] | null; // classement complet une fois jouée, 1er en tête
}

export interface BracketState {
  playerCount: number;
  tableSize: number;
  winnersRounds: TournamentTable[][];
  losersRounds: TournamentTable[][];
  champion: TournamentPlayer | null;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

/** La moitié arrondie vers le bas se qualifie ; minimum 1 pour les petites tables. */
function qualifiersFor(tableSize: number): number {
  if (tableSize <= 2) return 1;
  return Math.floor(tableSize / 2);
}

function buildRoundFromPlayers(
  players: TournamentPlayer[],
  tableSize: number,
  roundIndex: number,
  bracket: 'winners' | 'losers',
): TournamentTable[] {
  const groups = chunk(players, tableSize);
  return groups.map((group, idx) => ({
    id: `${bracket}-r${roundIndex}-t${idx}`,
    roundIndex,
    tableIndex: idx,
    bracket,
    seats: group.map((p) => ({ player: p })),
    qualifiedCount: bracket === 'winners' ? qualifiersFor(group.length) : 0,
    results: null,
  }));
}

/**
 * Crée un tournoi à partir de la liste réelle des inscrits (joueurs
 * enregistrés sélectionnés à la création). Le premier tour est posé,
 * aucune table n'est jouée : les résultats viendront des vraies parties.
 */
export function createTournament(players: TournamentPlayer[], tableSize: number): BracketState {
  const seeded = shuffleArray(players);
  const firstRound = buildRoundFromPlayers(seeded, tableSize, 0, 'winners');
  return {
    playerCount: players.length,
    tableSize,
    winnersRounds: [firstRound],
    losersRounds: [],
    champion: null,
  };
}

/**
 * Enregistre le classement d'une table réellement jouée, puis, quand toutes
 * les tables du dernier tour ont un résultat, construit le tour suivant chez
 * les gagnants et la table de repêchage pour les non-qualifiés.
 *
 * Aucun résultat n'est inventé : `results` doit venir d'une partie terminée.
 */
export function recordTableResult(
  state: BracketState,
  tableId: string,
  results: TournamentPlayer[],
): BracketState {
  const winnersRounds = state.winnersRounds.map((round) =>
    round.map((table) => (table.id === tableId ? { ...table, results } : table)),
  );
  const losersRounds = state.losersRounds.map((round) =>
    round.map((table) => (table.id === tableId ? { ...table, results } : table)),
  );

  const lastRoundIdx = winnersRounds.length - 1;
  const lastRound = winnersRounds[lastRoundIdx];
  const roundComplete = lastRound.every((t) => t.results !== null);
  if (!roundComplete) {
    return { ...state, winnersRounds, losersRounds };
  }

  // Repêchage : les non-qualifiés du tour se retrouvent entre eux.
  const eliminated: TournamentPlayer[] = [];
  lastRound.forEach((table) => {
    eliminated.push(...(table.results ?? []).slice(table.qualifiedCount));
  });
  if (eliminated.length > 0) {
    losersRounds.push(
      buildRoundFromPlayers(eliminated, state.tableSize, losersRounds.length, 'losers'),
    );
  }

  // Qualifiés : tour suivant, ou champion s'il n'en reste qu'un.
  const qualified: TournamentPlayer[] = [];
  lastRound.forEach((table) => {
    qualified.push(...(table.results ?? []).slice(0, table.qualifiedCount));
  });

  let champion = state.champion;
  if (qualified.length === 1) {
    champion = qualified[0];
  } else if (qualified.length > 1) {
    winnersRounds.push(
      buildRoundFromPlayers(qualified, state.tableSize, winnersRounds.length, 'winners'),
    );
  }

  return { ...state, winnersRounds, losersRounds, champion };
}

export function isTournamentOver(state: BracketState): boolean {
  return state.champion !== null;
}
