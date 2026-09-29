/**
 * Imposter — the pure game engine.
 *
 * One phone is passed around the table. Everyone draws a face-down card; all
 * cards carry the same word except the imposters', which carry a close cousin
 * (Chai vs Coffee). Nobody is told their role. Each round every player still in
 * gives one clue, starting from a random player and going round in seat order,
 * then the table votes one person out and their role is revealed.
 *
 *   Civilians win when every imposter is out.
 *   Imposters win when they survive until only one civilian is left.
 *
 * Scoring: +1 to every player for each vote they survive, and each imposter
 * still standing when the imposters win takes a victory bonus on top — so a
 * surviving imposter always tops that game.
 *
 * Everything here is pure (randomness is injected) so the UI, the server and
 * the tests all agree on the rules.
 */

import { pairKey, pairsFor, type WordPair } from "@/features/imposter/words";

export const SURVIVAL_POINTS = 1;
export const IMPOSTER_WIN_BONUS = 5;
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;

export type Rng = () => number;

export type Role = "civilian" | "imposter";
export type Winner = "civilians" | "imposters";
export type Phase = "deal" | "clues" | "vote" | "reveal" | "over";

export type Seat = { seatId: string; name: string; colorKey: string | null };

export type Card = { role: Role; word: string; claimedBy: string | null };

export type Elimination = { seatId: string; round: number; role: Role };

export type GameState = {
  version: 1;
  gameId: string;
  roomId: string;
  seats: Seat[];
  categoryId: string;
  categoryLabel: string;
  civilianWord: string;
  imposterWord: string;
  imposterCount: number;
  cards: Card[];
  /** Index into `seats` of whoever draws next during the deal. */
  dealIndex: number;
  phase: Phase;
  /** Current round (1-based). A round is one lap of clues plus one vote. */
  round: number;
  starterSeatId: string | null;
  /** Position in the clue order of whoever is speaking now. */
  clueIndex: number;
  eliminations: Elimination[];
  winner: Winner | null;
  peeks: Record<string, number>;
  startedAt: string;
};

export type SeatScore = {
  seatId: string;
  role: Role;
  word: string;
  eliminatedRound: number | null;
  roundsSurvived: number;
  bonus: number;
  points: number;
};

/* ------------------------------------------------------------------ setup */

export function maxImposters(playerCount: number) {
  return Math.max(1, Math.floor((playerCount - 1) / 2));
}

export function suggestedImposters(playerCount: number) {
  const suggestion = playerCount <= 6 ? 1 : playerCount <= 10 ? 2 : 3;
  return Math.min(suggestion, maxImposters(playerCount));
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A pair this room hasn't played yet; once the category is exhausted, anything goes again. */
export function pickPair(categoryId: string, usedPairKeys: readonly string[], rng: Rng): WordPair {
  const all = pairsFor(categoryId);

  if (all.length === 0) throw new Error(`Unknown word category: ${categoryId}`);

  const used = new Set(usedPairKeys);
  const fresh = all.filter((p) => !used.has(pairKey(p.words[0], p.words[1])));
  const pool = fresh.length > 0 ? fresh : all;

  return pool[Math.floor(rng() * pool.length)];
}

export function createGame(input: {
  gameId: string;
  roomId: string;
  seats: Seat[];
  imposterCount: number;
  pair: WordPair;
  rng: Rng;
  now?: string;
}): GameState {
  const { seats, pair, rng } = input;

  if (seats.length < MIN_PLAYERS) throw new Error(`Imposter needs at least ${MIN_PLAYERS} players.`);
  if (seats.length > MAX_PLAYERS) throw new Error(`Imposter supports up to ${MAX_PLAYERS} players.`);
  if (new Set(seats.map((s) => s.seatId)).size !== seats.length) throw new Error("Each player can only sit once.");

  const imposterCount = Math.min(Math.max(1, Math.round(input.imposterCount)), maxImposters(seats.length));

  // Either side of the pair can be the odd one out.
  const flip = rng() < 0.5;
  const civilianWord = flip ? pair.words[1] : pair.words[0];
  const imposterWord = flip ? pair.words[0] : pair.words[1];

  const roles: Role[] = seats.map((_, i) => (i < imposterCount ? "imposter" : "civilian"));
  const cards = shuffle(roles, rng).map((role) => ({
    role,
    word: role === "imposter" ? imposterWord : civilianWord,
    claimedBy: null,
  }));

  return {
    version: 1,
    gameId: input.gameId,
    roomId: input.roomId,
    seats,
    categoryId: pair.categoryId,
    categoryLabel: pair.categoryLabel,
    civilianWord,
    imposterWord,
    imposterCount,
    cards,
    dealIndex: 0,
    phase: "deal",
    round: 0,
    starterSeatId: null,
    clueIndex: 0,
    eliminations: [],
    winner: null,
    peeks: {},
    startedAt: input.now ?? new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------- deal */

/** Whoever holds the phone during the deal, or null once everyone has drawn. */
export function currentDrawer(state: GameState): Seat | null {
  return state.phase === "deal" ? (state.seats[state.dealIndex] ?? null) : null;
}

/** The current drawer keeps the card they tapped. The card is theirs for the whole game. */
export function claimCard(state: GameState, cardIndex: number): GameState {
  const drawer = currentDrawer(state);
  const card = state.cards[cardIndex];

  if (!drawer) throw new Error("Everyone already has a card.");
  if (!card) throw new Error("No such card.");
  if (card.claimedBy) throw new Error("That card is already taken.");

  const cards = state.cards.map((c, i) => (i === cardIndex ? { ...c, claimedBy: drawer.seatId } : c));

  return { ...state, cards, dealIndex: state.dealIndex + 1 };
}

export function dealComplete(state: GameState) {
  return state.cards.every((c) => c.claimedBy !== null);
}

export function cardOf(state: GameState, seatId: string) {
  return state.cards.find((c) => c.claimedBy === seatId) ?? null;
}

export function recordPeek(state: GameState, seatId: string): GameState {
  if (!cardOf(state, seatId)) throw new Error("That player hasn't drawn a card yet.");
  return { ...state, peeks: { ...state.peeks, [seatId]: (state.peeks[seatId] ?? 0) + 1 } };
}

/* ----------------------------------------------------------------- rounds */

export function isAlive(state: GameState, seatId: string) {
  return !state.eliminations.some((e) => e.seatId === seatId);
}

export function aliveSeats(state: GameState) {
  return state.seats.filter((s) => isAlive(state, s.seatId));
}

export function roleOf(state: GameState, seatId: string): Role {
  return cardOf(state, seatId)?.role ?? "civilian";
}

function aliveCounts(state: GameState) {
  let imposters = 0;
  let civilians = 0;
  for (const seat of aliveSeats(state)) {
    if (roleOf(state, seat.seatId) === "imposter") imposters += 1;
    else civilians += 1;
  }
  return { imposters, civilians };
}

export function winnerOf(state: GameState): Winner | null {
  const { imposters, civilians } = aliveCounts(state);
  if (imposters === 0) return "civilians";
  if (civilians <= 1) return "imposters";
  return null;
}

/** Opens the next round with a fresh random first speaker. */
export function startRound(state: GameState, rng: Rng): GameState {
  if (state.phase === "deal" && !dealComplete(state)) throw new Error("Not everyone has drawn a card yet.");
  if (state.phase !== "deal" && state.phase !== "reveal") throw new Error("A round is already underway.");
  if (state.winner) throw new Error("This game is over.");

  const alive = aliveSeats(state);
  const starter = alive[Math.floor(rng() * alive.length)];

  return { ...state, phase: "clues", round: state.round + 1, starterSeatId: starter.seatId, clueIndex: 0 };
}

/** Everyone still in, starting from the round's first speaker and going round the table in seat order. */
export function clueOrder(state: GameState): Seat[] {
  const alive = aliveSeats(state);
  const start = alive.findIndex((s) => s.seatId === state.starterSeatId);

  if (start < 0) return alive;

  return [...alive.slice(start), ...alive.slice(0, start)];
}

export function nextClue(state: GameState): GameState {
  if (state.phase !== "clues") throw new Error("Not taking clues right now.");

  const next = state.clueIndex + 1;

  return next >= clueOrder(state).length ? { ...state, phase: "vote", clueIndex: next } : { ...state, clueIndex: next };
}

export function openVote(state: GameState): GameState {
  if (state.phase !== "clues") throw new Error("Not taking clues right now.");
  return { ...state, phase: "vote" };
}

/** The table voted `seatId` out. Their role is revealed and the game may end here. */
export function voteOut(state: GameState, seatId: string): GameState {
  if (state.phase !== "vote") throw new Error("It isn't time to vote.");
  if (!state.seats.some((s) => s.seatId === seatId)) throw new Error("That player isn't in this game.");
  if (!isAlive(state, seatId)) throw new Error("That player is already out.");

  const eliminations = [...state.eliminations, { seatId, round: state.round, role: roleOf(state, seatId) }];
  const next: GameState = { ...state, eliminations, phase: "reveal" };

  return { ...next, winner: winnerOf(next) };
}

export function finishGame(state: GameState): GameState {
  if (!state.winner) throw new Error("Nobody has won yet.");
  return { ...state, phase: "over" };
}

export function lastElimination(state: GameState): Elimination | null {
  return state.eliminations[state.eliminations.length - 1] ?? null;
}

/* ---------------------------------------------------------------- scoring */

export function scoreGame(state: GameState): SeatScore[] {
  if (!state.winner) throw new Error("Score a game only once it has a winner.");

  const votes = state.round;

  return state.seats.map((seat) => {
    const card = cardOf(state, seat.seatId);
    const role = card?.role ?? "civilian";
    const out = state.eliminations.find((e) => e.seatId === seat.seatId) ?? null;
    const roundsSurvived = out ? out.round - 1 : votes;
    const bonus = state.winner === "imposters" && role === "imposter" && !out ? IMPOSTER_WIN_BONUS : 0;

    return {
      seatId: seat.seatId,
      role,
      word: card?.word ?? "",
      eliminatedRound: out?.round ?? null,
      roundsSurvived,
      bonus,
      points: roundsSurvived * SURVIVAL_POINTS + bonus,
    };
  });
}

export type ScoreRow = { seatId: string; points: number; role: Role; won: boolean };

export type StandingRow = {
  seatId: string;
  points: number;
  games: number;
  wins: number;
  imposterGames: number;
  imposterWins: number;
};

/** Running room scoreboard: most points first, then most wins. */
export function standings(rows: readonly ScoreRow[], seatIds: readonly string[] = []): StandingRow[] {
  const bySeat = new Map<string, StandingRow>();
  const blank = (seatId: string): StandingRow => ({
    seatId,
    points: 0,
    games: 0,
    wins: 0,
    imposterGames: 0,
    imposterWins: 0,
  });

  for (const id of seatIds) bySeat.set(id, blank(id));

  for (const row of rows) {
    const s = bySeat.get(row.seatId) ?? blank(row.seatId);
    s.points += row.points;
    s.games += 1;
    if (row.won) s.wins += 1;
    if (row.role === "imposter") {
      s.imposterGames += 1;
      if (row.won) s.imposterWins += 1;
    }
    bySeat.set(row.seatId, s);
  }

  return [...bySeat.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
}

export function wonGame(role: Role, winner: Winner) {
  return (role === "imposter") === (winner === "imposters");
}
