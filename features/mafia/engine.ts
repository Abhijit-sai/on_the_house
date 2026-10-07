/**
 * Mafia — the pure game engine.
 *
 * A person plays God. The phone goes round the players once so each sees their
 * role in private, then it stays with God, who runs every night from a script
 * (eyes closed, wake the mafia, the doctor, the detective) and counts the
 * town's votes by day. The app is God's memory: who's who, who the doctor
 * saved last night, what the detective already knows, who's dead, and how
 * many hands make a majority.
 *
 *   Town wins when every mafioso is out.
 *   Mafia wins once they match the town head for head.
 *
 * The game is an ordered log of events (nights, votes, people leaving) on top
 * of a fixed setup. `walk()` replays that log — validating every step — so the
 * UI, the server and the tests all derive the same deaths, winner and scores.
 * Randomness is injected so everything here stays pure.
 */

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 16;
/** The crew is the players plus God. */
export const MIN_CREW = MIN_PLAYERS + 1;
export const MAX_CREW = MAX_PLAYERS + 1;

export const SURVIVAL_POINTS = 1;
export const WIN_BONUS = 3;
export const MAFIA_ALIVE_BONUS = 2;
export const SAVE_POINTS = 2;
export const FIND_POINTS = 1;

export const DAY_TIMER_OPTIONS = [0, 120, 180, 300] as const;

export type Rng = () => number;

export type Role = "mafia" | "doctor" | "detective" | "villager";
export type Team = "mafia" | "town";
export type NightRole = "mafia" | "doctor" | "detective";
export type Phase = "deal" | "handback" | "night" | "dawn" | "day" | "vote" | "verdict" | "over";

export type Seat = { seatId: string; name: string; colorKey: string | null };

/** How often the doctor may protect themselves. */
export type SelfSave = "never" | "once" | "always";

/** "most": the most hands goes (a tie at the top spares everyone). "majority": needs over half the living. */
export type VoteRule = "most" | "majority";

export type Settings = {
  mafiaCount: number;
  doctor: boolean;
  detective: boolean;
  revealOnDeath: boolean;
  dayTimerSec: number;
  /** Optional so games saved before these rules existed still replay with the defaults. */
  doctorSelfSave?: SelfSave;
  voteRule?: VoteRule;
};

export const DEFAULT_SELF_SAVE: SelfSave = "once";
export const DEFAULT_VOTE_RULE: VoteRule = "most";

export const selfSaveOf = (settings: Settings) => settings.doctorSelfSave ?? DEFAULT_SELF_SAVE;
export const voteRuleOf = (settings: Settings) => settings.voteRule ?? DEFAULT_VOTE_RULE;

export type Tally = { seatId: string; hands: number };

export type GameEvent =
  | { t: "night"; night: number; mafia: string | null; doctor: string | null; detective: string | null }
  | { t: "vote"; day: number; tallies: Tally[]; out: string | null }
  | { t: "left"; seatId: string }
  | { t: "peek"; seatId: string };

/** God's picks for the night in progress, before dawn locks them in. */
export type NightDraft = {
  night: number;
  /** Position in God's script: 0 = "close your eyes", then one per role, then "wake up". */
  step: number;
  mafia: string | null;
  doctor: string | null;
  detective: string | null;
};

export type GameState = {
  version: 1;
  gameId: string;
  roomId: string;
  god: Seat;
  /** The players, in the order the phone goes round. God is not among them. */
  seats: Seat[];
  roles: Record<string, Role>;
  settings: Settings;
  events: GameEvent[];
  phase: Phase;
  /** Index into `seats` of whoever sees their role next during the deal. */
  dealIndex: number;
  draft: NightDraft | null;
  dayStartedAt: string | null;
  /** Minutes God added to today's timer, in seconds. */
  dayBonusSec?: number;
  startedAt: string;
  /** One step of undo for God — never sent to the server. */
  undo?: Omit<GameState, "undo"> | null;
};

/* ------------------------------------------------------------------ setup */

export function teamOf(role: Role): Team {
  return role === "mafia" ? "mafia" : "town";
}

/** Keeps the town a real majority at the start: at most a third of the table (rounded down, less one). */
export function maxMafia(playerCount: number) {
  return Math.max(1, Math.floor((playerCount - 1) / 3));
}

export function suggestedMafia(playerCount: number) {
  const suggestion = playerCount <= 6 ? 1 : playerCount <= 9 ? 2 : playerCount <= 12 ? 3 : 4;
  return Math.min(suggestion, maxMafia(playerCount));
}

export function defaultSettings(playerCount: number): Settings {
  return {
    mafiaCount: suggestedMafia(playerCount),
    doctor: true,
    detective: playerCount >= 6,
    revealOnDeath: true,
    dayTimerSec: 180,
    doctorSelfSave: DEFAULT_SELF_SAVE,
    voteRule: DEFAULT_VOTE_RULE,
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createGame(input: {
  gameId: string;
  roomId: string;
  god: Seat;
  seats: Seat[];
  settings: Settings;
  rng: Rng;
  now?: string;
}): GameState {
  const { god, seats, rng } = input;

  if (seats.length < MIN_PLAYERS) throw new Error(`Mafia needs at least ${MIN_PLAYERS} players besides God.`);
  if (seats.length > MAX_PLAYERS) throw new Error(`Mafia supports up to ${MAX_PLAYERS} players.`);
  if (new Set(seats.map((s) => s.seatId)).size !== seats.length) throw new Error("Each player can only sit once.");
  if (seats.some((s) => s.seatId === god.seatId)) throw new Error("God doesn't play.");

  const settings: Settings = {
    ...input.settings,
    mafiaCount: Math.min(Math.max(1, Math.round(input.settings.mafiaCount)), maxMafia(seats.length)),
  };

  const deck: Role[] = [
    ...Array<Role>(settings.mafiaCount).fill("mafia"),
    ...(settings.doctor ? (["doctor"] as Role[]) : []),
    ...(settings.detective ? (["detective"] as Role[]) : []),
  ];
  while (deck.length < seats.length) deck.push("villager");

  const dealt = shuffle(deck, rng);
  const roles = Object.fromEntries(seats.map((s, i) => [s.seatId, dealt[i]]));

  return {
    version: 1,
    gameId: input.gameId,
    roomId: input.roomId,
    god,
    seats,
    roles,
    settings,
    events: [],
    phase: "deal",
    dealIndex: 0,
    draft: null,
    dayStartedAt: null,
    startedAt: input.now ?? new Date().toISOString(),
  };
}

/** The setup must be exactly what `createGame` could have dealt. */
export function validateSetup(state: GameState) {
  const ids = state.seats.map((s) => s.seatId);
  const { settings } = state;

  if (ids.length < MIN_PLAYERS || ids.length > MAX_PLAYERS) throw new Error("Wrong number of players.");
  if (new Set(ids).size !== ids.length) throw new Error("A player sat twice.");
  if (ids.includes(state.god.seatId)) throw new Error("God can't hold a role.");
  if (Object.keys(state.roles).length !== ids.length || ids.some((id) => !state.roles[id])) {
    throw new Error("Roles and players don't match.");
  }

  const count = (role: Role) => ids.filter((id) => state.roles[id] === role).length;

  if (settings.mafiaCount < 1 || settings.mafiaCount > maxMafia(ids.length)) throw new Error("Too many mafia.");
  if (count("mafia") !== settings.mafiaCount) throw new Error("Mafia count doesn't match the deal.");
  if (count("doctor") !== (settings.doctor ? 1 : 0)) throw new Error("Doctor doesn't match the deal.");
  if (count("detective") !== (settings.detective ? 1 : 0)) throw new Error("Detective doesn't match the deal.");
}

/* ------------------------------------------------------------------- deal */

/** Whoever holds the phone during the deal, or null once everyone has seen their role. */
export function currentDealee(state: GameState): Seat | null {
  return state.phase === "deal" ? (state.seats[state.dealIndex] ?? null) : null;
}

/** The current player has seen their role; hand on to the next (or back to God after the last). */
export function confirmRole(state: GameState): GameState {
  if (!currentDealee(state)) throw new Error("Everyone has already seen their role.");
  const dealIndex = state.dealIndex + 1;
  return { ...state, dealIndex, phase: dealIndex >= state.seats.length ? "handback" : "deal" };
}

/** The other mafia a mafioso sees on their card. */
export function partnersOf(state: GameState, seatId: string): Seat[] {
  if (state.roles[seatId] !== "mafia") return [];
  return state.seats.filter((s) => s.seatId !== seatId && state.roles[s.seatId] === "mafia");
}

/* ----------------------------------------------------------------- ledger */

export type NightRecord = {
  kind: "night";
  night: number;
  mafia: string | null;
  doctor: string | null;
  detective: string | null;
  /** Who held each role that night (null when the role is out of the game or never dealt). */
  doctorSeatId: string | null;
  detectiveSeatId: string | null;
  foundMafia: boolean | null;
  killed: string | null;
  saved: boolean;
};

export type DayRecord = {
  kind: "day";
  day: number;
  tallies: Tally[];
  majority: number;
  out: string | null;
};

export type LeftRecord = { kind: "left"; seatId: string; afterNight: number };

export type StoryEntry = NightRecord | DayRecord | LeftRecord;

export type Fate = { cause: "night" | "vote" | "left"; at: number; order: number };

export type Ledger = {
  alive: Set<string>;
  fates: Map<string, Fate>;
  story: StoryEntry[];
  nights: number;
  days: number;
  winner: Team | null;
  /** The doctor's pick last night (they can't protect the same player twice running). */
  lastDoctorPick: string | null;
  doctorSelfSaveUsed: boolean;
  /** What the detective has learned so far, by target. */
  checks: Map<string, boolean>;
  survived: Map<string, number>;
  peeks: Record<string, number>;
};

function holderOf(state: GameState, role: Role, alive: Set<string>) {
  const seat = state.seats.find((s) => state.roles[s.seatId] === role && alive.has(s.seatId));
  return seat?.seatId ?? null;
}

function checkWinner(state: GameState, alive: Set<string>): Team | null {
  let mafia = 0;
  let town = 0;
  for (const id of alive) {
    if (state.roles[id] === "mafia") mafia += 1;
    else town += 1;
  }
  if (mafia === 0) return "town";
  if (mafia >= town) return "mafia";
  return null;
}

export function majorityOf(aliveCount: number) {
  return Math.floor(aliveCount / 2) + 1;
}

/**
 * Who the town votes out. By "most" hands, the clear leader goes; by
 * "majority", only someone with over half the living. A tie at the top (or
 * nobody reaching the bar) and nobody goes.
 */
export function voteOutcome(tallies: readonly Tally[], aliveCount: number, rule: VoteRule = "majority"): string | null {
  const best = Math.max(0, ...tallies.map((t) => t.hands));
  if (best === 0) return null;

  const leaders = tallies.filter((t) => t.hands === best);
  if (leaders.length !== 1) return null;

  return rule === "most" || best >= majorityOf(aliveCount) ? leaders[0].seatId : null;
}

/**
 * Replays the event log from the deal, enforcing every rule. Throws on the
 * first illegal event, so the server can trust whatever comes out.
 */
export function walk(state: GameState): Ledger {
  const ids = new Set(state.seats.map((s) => s.seatId));
  const alive = new Set(ids);
  const fates = new Map<string, Fate>();
  const story: StoryEntry[] = [];
  const checks = new Map<string, boolean>();
  const survived = new Map<string, number>(state.seats.map((s) => [s.seatId, 0]));
  const peeks: Record<string, number> = {};

  let nights = 0;
  let days = 0;
  let winner: Team | null = null;
  let lastDoctorPick: string | null = null;
  let doctorSelfSaveUsed = false;

  const mustBeAlive = (id: string, what: string) => {
    if (!ids.has(id)) throw new Error(`${what} isn't in this game.`);
    if (!alive.has(id)) throw new Error(`${what} is already out.`);
  };

  const kill = (id: string, cause: Fate["cause"], at: number) => {
    alive.delete(id);
    fates.set(id, { cause, at, order: fates.size });
  };

  for (const ev of state.events) {
    if (ev.t === "peek") {
      if (!ids.has(ev.seatId)) throw new Error("Peek from someone not in the game.");
      peeks[ev.seatId] = (peeks[ev.seatId] ?? 0) + 1;
      continue;
    }

    if (winner) throw new Error("The game was already over.");

    if (ev.t === "night") {
      if (nights !== days || ev.night !== nights + 1) throw new Error("Nights and days are out of order.");

      const doctorSeatId = state.settings.doctor ? holderOf(state, "doctor", alive) : null;
      const detectiveSeatId = state.settings.detective ? holderOf(state, "detective", alive) : null;

      // The mafia may hit one of their own — a bold bluff. God's screen asks twice.
      if (ev.mafia !== null) mustBeAlive(ev.mafia, "The mafia's target");

      if (ev.doctor !== null) {
        if (!doctorSeatId) throw new Error("There's no doctor to protect anyone.");
        mustBeAlive(ev.doctor, "The doctor's pick");
        if (ev.doctor === lastDoctorPick)
          throw new Error("The doctor can't protect the same player two nights running.");
        if (ev.doctor === doctorSeatId) {
          const selfSave = selfSaveOf(state.settings);
          if (selfSave === "never") throw new Error("The doctor can't protect themselves in this game.");
          if (selfSave === "once" && doctorSelfSaveUsed) throw new Error("The doctor already used their self-save.");
          doctorSelfSaveUsed = true;
        }
      }

      if (ev.detective !== null) {
        if (!detectiveSeatId) throw new Error("There's no detective to investigate.");
        mustBeAlive(ev.detective, "The detective's pick");
        if (ev.detective === detectiveSeatId) throw new Error("The detective can't investigate themselves.");
      }

      const before = [...alive];
      const saved = ev.mafia !== null && ev.mafia === ev.doctor;
      const killed = ev.mafia !== null && !saved ? ev.mafia : null;
      const foundMafia = ev.detective !== null ? state.roles[ev.detective] === "mafia" : null;

      nights = ev.night;
      lastDoctorPick = ev.doctor;
      if (ev.detective !== null) checks.set(ev.detective, foundMafia === true);
      if (killed) kill(killed, "night", ev.night);
      for (const id of before) if (id !== killed) survived.set(id, (survived.get(id) ?? 0) + SURVIVAL_POINTS);

      story.push({
        kind: "night",
        night: ev.night,
        mafia: ev.mafia,
        doctor: ev.doctor,
        detective: ev.detective,
        doctorSeatId,
        detectiveSeatId,
        foundMafia,
        killed,
        saved,
      });
    } else if (ev.t === "vote") {
      if (nights !== days + 1 || ev.day !== days + 1) throw new Error("Nights and days are out of order.");

      const seen = new Set<string>();
      let hands = 0;
      for (const t of ev.tallies) {
        mustBeAlive(t.seatId, "A nominee");
        if (seen.has(t.seatId)) throw new Error("Someone was nominated twice.");
        if (!Number.isInteger(t.hands) || t.hands < 0) throw new Error("Hands must be a whole number.");
        seen.add(t.seatId);
        hands += t.hands;
      }
      if (hands > alive.size) throw new Error("More hands than living players.");

      const out = voteOutcome(ev.tallies, alive.size, voteRuleOf(state.settings));
      if (out !== ev.out) throw new Error("The vote result doesn't add up.");

      const before = [...alive];
      days = ev.day;
      if (out) kill(out, "vote", ev.day);
      for (const id of before) if (id !== out) survived.set(id, (survived.get(id) ?? 0) + SURVIVAL_POINTS);

      story.push({ kind: "day", day: ev.day, tallies: ev.tallies, majority: majorityOf(before.length), out });
    } else {
      mustBeAlive(ev.seatId, "That player");
      kill(ev.seatId, "left", nights);
      story.push({ kind: "left", seatId: ev.seatId, afterNight: nights });
    }

    winner = checkWinner(state, alive);
  }

  return {
    alive,
    fates,
    story,
    nights,
    days,
    winner,
    lastDoctorPick,
    doctorSelfSaveUsed,
    checks,
    survived,
    peeks,
  };
}

export function winnerOf(state: GameState) {
  return walk(state).winner;
}

export function aliveSeats(state: GameState, ledger = walk(state)) {
  return state.seats.filter((s) => ledger.alive.has(s.seatId));
}

export function seatName(state: GameState, seatId: string | null) {
  if (!seatId) return "";
  return state.seats.find((s) => s.seatId === seatId)?.name ?? "?";
}

/* ------------------------------------------------------------------ night */

export type NightStep = {
  role: NightRole;
  /** Who's awake for this step — God checks the right eyes open. */
  holders: Seat[];
  /** The role is dead (or the whole family is): call it anyway so the table can't tell. */
  pretend: boolean;
};

/** Every role in the setup gets called every night, alive or not. */
export function nightSteps(state: GameState, ledger = walk(state)): NightStep[] {
  const steps: NightStep[] = [];
  const living = (role: Role) =>
    state.seats.filter((s) => state.roles[s.seatId] === role && ledger.alive.has(s.seatId));

  steps.push({ role: "mafia", holders: living("mafia"), pretend: living("mafia").length === 0 });
  if (state.settings.doctor)
    steps.push({ role: "doctor", holders: living("doctor"), pretend: living("doctor").length === 0 });
  if (state.settings.detective) {
    steps.push({ role: "detective", holders: living("detective"), pretend: living("detective").length === 0 });
  }

  return steps;
}

export type Target = { seat: Seat; disabled: boolean; note: string | null };

/** Who God can tap for a role tonight, and why some are greyed out. */
export function targetsFor(state: GameState, role: NightRole, ledger = walk(state)): Target[] {
  const alive = aliveSeats(state, ledger);
  const doctorSeatId = holderOf(state, "doctor", ledger.alive);
  const detectiveSeatId = holderOf(state, "detective", ledger.alive);

  return alive.map((seat) => {
    const id = seat.seatId;

    if (role === "mafia") {
      return { seat, disabled: false, note: state.roles[id] === "mafia" ? "Family" : null };
    }

    if (role === "doctor") {
      if (id === ledger.lastDoctorPick) return { seat, disabled: true, note: "Saved last night" };
      if (id === doctorSeatId) {
        const selfSave = selfSaveOf(state.settings);
        if (selfSave === "never") return { seat, disabled: true, note: "Can't self-save" };
        if (selfSave === "always") return { seat, disabled: false, note: "Themselves" };
        return ledger.doctorSelfSaveUsed
          ? { seat, disabled: true, note: "Self-save used" }
          : { seat, disabled: false, note: "Self-save (once)" };
      }
      return { seat, disabled: false, note: null };
    }

    if (id === detectiveSeatId) return { seat, disabled: true, note: "Themselves" };
    const known = ledger.checks.get(id);
    return { seat, disabled: false, note: known === undefined ? null : known ? "Checked: mafia" : "Checked: clean" };
  });
}

/** Opens the next night (from God's handback, or after a day's verdict). */
export function beginNight(state: GameState): GameState {
  const ledger = walk(state);
  if (ledger.winner) throw new Error("This game is over.");
  if (state.phase !== "handback" && state.phase !== "verdict") throw new Error("It isn't time for night.");
  if (ledger.nights !== ledger.days) throw new Error("The town still has to vote.");

  return {
    ...state,
    phase: "night",
    dayStartedAt: null,
    draft: { night: ledger.nights + 1, step: 0, mafia: null, doctor: null, detective: null },
  };
}

export function updateDraft(state: GameState, patch: Partial<Omit<NightDraft, "night">>): GameState {
  if (state.phase !== "night" || !state.draft) throw new Error("It isn't night.");
  return { ...state, draft: { ...state.draft, ...patch } };
}

/** Dawn: God's picks become the night, and its outcome is fixed. */
export function commitNight(state: GameState): GameState {
  if (state.phase !== "night" || !state.draft) throw new Error("It isn't night.");

  const { night, mafia, doctor, detective } = state.draft;
  const next: GameState = {
    ...state,
    events: [...state.events, { t: "night", night, mafia, doctor, detective }],
    phase: "dawn",
    draft: null,
  };

  walk(next);
  return next;
}

export function lastNight(state: GameState, ledger = walk(state)): NightRecord | null {
  for (let i = ledger.story.length - 1; i >= 0; i -= 1) {
    const entry = ledger.story[i];
    if (entry.kind === "night") return entry;
  }
  return null;
}

/* -------------------------------------------------------------------- day */

export function startDay(state: GameState, now = new Date().toISOString()): GameState {
  if (state.phase !== "dawn") throw new Error("It isn't dawn.");
  if (winnerOf(state)) throw new Error("This game is over.");
  return { ...state, phase: "day", dayStartedAt: now, dayBonusSec: 0 };
}

/** God gives the town more time. Stored apart from the start time so the clock keeps running. */
export function extendDay(state: GameState, seconds = 60): GameState {
  if (state.phase !== "day") throw new Error("It isn't daytime.");
  return { ...state, dayBonusSec: (state.dayBonusSec ?? 0) + seconds };
}

export function openVote(state: GameState): GameState {
  if (state.phase !== "day") throw new Error("It isn't daytime.");
  return { ...state, phase: "vote" };
}

export function backToDay(state: GameState): GameState {
  if (state.phase !== "vote") throw new Error("Not voting right now.");
  return { ...state, phase: "day" };
}

export function commitVote(state: GameState, tallies: Tally[]): GameState {
  if (state.phase !== "vote") throw new Error("It isn't time to vote.");

  const ledger = walk(state);
  // A nominee nobody raised a hand for isn't worth keeping in the story.
  const clean = tallies.filter((t) => t.hands > 0);
  const out = voteOutcome(clean, ledger.alive.size, voteRuleOf(state.settings));
  const next: GameState = {
    ...state,
    events: [...state.events, { t: "vote", day: ledger.days + 1, tallies: clean, out }],
    phase: "verdict",
  };

  walk(next);
  return next;
}

/** Someone had to leave. They're out, their role is shown, and the game may end there. */
export function removePlayer(state: GameState, seatId: string): GameState {
  if (!["dawn", "day", "vote"].includes(state.phase)) throw new Error("Players can only leave by day.");

  const next: GameState = { ...state, events: [...state.events, { t: "left", seatId }] };
  const ledger = walk(next);

  return ledger.winner ? { ...next, phase: "verdict" } : next;
}

export function recordPeek(state: GameState, seatId: string): GameState {
  if (!state.seats.some((s) => s.seatId === seatId)) throw new Error("That player isn't in this game.");
  return { ...state, events: [...state.events, { t: "peek", seatId }] };
}

export function lastEntry(state: GameState, ledger = walk(state)): StoryEntry | null {
  return ledger.story[ledger.story.length - 1] ?? null;
}

export function finishGame(state: GameState): GameState {
  if (!winnerOf(state)) throw new Error("Nobody has won yet.");
  return { ...state, phase: "over", undo: null };
}

/* ------------------------------------------------------------------- undo */

/** Wraps a step so God can take it back once. */
export function withUndo(previous: GameState, next: GameState): GameState {
  const { undo: _dropped, ...snapshot } = previous;
  void _dropped;
  return { ...next, undo: snapshot };
}

export function undoLast(state: GameState): GameState {
  if (!state.undo) throw new Error("Nothing to undo.");
  return { ...state.undo, undo: null };
}

/* ---------------------------------------------------------------- scoring */

export type SeatScore = {
  seatId: string;
  role: Role;
  team: Team;
  won: boolean;
  diedNight: number | null;
  votedOutDay: number | null;
  leftGame: boolean;
  survived: number;
  bonus: number;
  saves: number;
  finds: number;
  peeks: number;
  points: number;
};

export function scoreGame(state: GameState): SeatScore[] {
  const ledger = walk(state);
  const winner = ledger.winner;
  if (!winner) throw new Error("Score a game only once it has a winner.");

  const nightsLog = ledger.story.filter((e): e is NightRecord => e.kind === "night");

  return state.seats.map((seat) => {
    const id = seat.seatId;
    const role = state.roles[id];
    const team = teamOf(role);
    const fate = ledger.fates.get(id) ?? null;
    const won = team === winner;

    const saves = nightsLog.filter((n) => n.saved && n.doctorSeatId === id).length;
    const finds = new Set(nightsLog.filter((n) => n.foundMafia && n.detectiveSeatId === id).map((n) => n.detective))
      .size;
    const survived = ledger.survived.get(id) ?? 0;
    const bonus =
      (won ? WIN_BONUS : 0) + (winner === "mafia" && role === "mafia" && ledger.alive.has(id) ? MAFIA_ALIVE_BONUS : 0);

    return {
      seatId: id,
      role,
      team,
      won,
      diedNight: fate?.cause === "night" ? fate.at : null,
      votedOutDay: fate?.cause === "vote" ? fate.at : null,
      leftGame: fate?.cause === "left",
      survived,
      bonus,
      saves,
      finds,
      peeks: ledger.peeks[id] ?? 0,
      points: survived + bonus + saves * SAVE_POINTS + finds * FIND_POINTS,
    };
  });
}

/* ----------------------------------------------------------------- awards */

export type Award = { id: string; emoji: string; title: string; seatId: string; detail: string };

/** The superlatives on the end-of-game story. Deterministic, never scored. */
export function awardsFor(state: GameState): Award[] {
  const ledger = walk(state);
  const awards: Award[] = [];
  const nightsLog = ledger.story.filter((e): e is NightRecord => e.kind === "night");
  const daysLog = ledger.story.filter((e): e is DayRecord => e.kind === "day");

  const firstHit = nightsLog.find((n) => n.killed);
  if (firstHit?.killed) {
    awards.push({
      id: "first-blood",
      emoji: "🩸",
      title: "First blood",
      seatId: firstHit.killed,
      detail: `Hit on night ${firstHit.night}`,
    });
  }

  const savedCount = new Map<string, number>();
  for (const n of nightsLog) if (n.saved && n.mafia) savedCount.set(n.mafia, (savedCount.get(n.mafia) ?? 0) + 1);
  const untouchable = [...savedCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (untouchable) {
    awards.push({
      id: "untouchable",
      emoji: "🛡️",
      title: "Untouchable",
      seatId: untouchable[0],
      detail: `Saved by the doctor ${untouchable[1] === 1 ? "once" : `${untouchable[1]} times`}`,
    });
  }

  const framed = daysLog.find((d) => d.out && state.roles[d.out] !== "mafia");
  if (framed?.out) {
    awards.push({
      id: "framed",
      emoji: "🎯",
      title: "Framed",
      seatId: framed.out,
      detail: `The town got it wrong on day ${framed.day}`,
    });
  }

  const sherlock = scoreGame(state).find((s) => s.role === "detective" && s.finds > 0);
  if (sherlock) {
    awards.push({
      id: "sherlock",
      emoji: "🔍",
      title: "Sherlock",
      seatId: sherlock.seatId,
      detail: sherlock.finds === 1 ? "Found a mafioso" : `Found ${sherlock.finds} mafiosi`,
    });
  }

  // The mafioso who lasted longest: still standing beats anyone who fell, then the latest to fall.
  const mafia = state.seats.filter((s) => state.roles[s.seatId] === "mafia");
  const lasted = (id: string) => ledger.fates.get(id)?.order ?? Number.MAX_SAFE_INTEGER;
  const coldest = [...mafia].sort((a, b) => lasted(b.seatId) - lasted(a.seatId))[0];
  if (coldest) {
    const fate = ledger.fates.get(coldest.seatId);
    awards.push({
      id: "cold-blooded",
      emoji: "🧊",
      title: "Cold-blooded",
      seatId: coldest.seatId,
      detail: fate ? "Last of the family to fall" : "Never got caught",
    });
  }

  return awards;
}

/* -------------------------------------------------------------- standings */

export type ScoreRow = { seatId: string; points: number; role: Role; won: boolean };

export type StandingRow = {
  seatId: string;
  points: number;
  games: number;
  wins: number;
  mafiaGames: number;
  mafiaWins: number;
  narrated: number;
};

/** Running room scoreboard: most points first, then most wins. God's games count as "narrated". */
export function standings(
  rows: readonly ScoreRow[],
  godSeatIds: readonly string[],
  seatIds: readonly string[] = [],
): StandingRow[] {
  const bySeat = new Map<string, StandingRow>();
  const blank = (seatId: string): StandingRow => ({
    seatId,
    points: 0,
    games: 0,
    wins: 0,
    mafiaGames: 0,
    mafiaWins: 0,
    narrated: 0,
  });
  const get = (id: string) => {
    const row = bySeat.get(id) ?? blank(id);
    bySeat.set(id, row);
    return row;
  };

  for (const id of seatIds) get(id);

  for (const row of rows) {
    const s = get(row.seatId);
    s.points += row.points;
    s.games += 1;
    if (row.won) s.wins += 1;
    if (row.role === "mafia") {
      s.mafiaGames += 1;
      if (row.won) s.mafiaWins += 1;
    }
  }

  for (const id of godSeatIds) get(id).narrated += 1;

  return [...bySeat.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
}

/** Whoever has narrated least goes next; ties go to the earliest seat. */
export function suggestGod(seatIds: readonly string[], narrated: ReadonlyMap<string, number>): string | null {
  let best: string | null = null;
  for (const id of seatIds) {
    if (best === null || (narrated.get(id) ?? 0) < (narrated.get(best) ?? 0)) best = id;
  }
  return best;
}
