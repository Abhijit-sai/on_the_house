import { describe, expect, it } from "vitest";
import {
  FIND_POINTS,
  MAFIA_ALIVE_BONUS,
  SAVE_POINTS,
  WIN_BONUS,
  awardsFor,
  beginNight,
  commitNight,
  commitVote,
  confirmRole,
  createGame,
  currentDealee,
  defaultSettings,
  extendDay,
  finishGame,
  majorityOf,
  maxMafia,
  nightSteps,
  openVote,
  partnersOf,
  recordPeek,
  removePlayer,
  scoreGame,
  standings,
  startDay,
  suggestGod,
  suggestedMafia,
  targetsFor,
  undoLast,
  updateDraft,
  validateSetup,
  voteOutcome,
  walk,
  winnerOf,
  withUndo,
  type GameState,
  type Role,
  type Seat,
  type Settings,
} from "@/features/mafia/engine";

const god: Seat = { seatId: "god", name: "God", colorKey: null };

const seats = (n: number): Seat[] =>
  Array.from({ length: n }, (_, i) => ({ seatId: `s${i + 1}`, name: `P${i + 1}`, colorKey: null }));

/** A game with roles fixed by seat (s1 gets roles[0], …), dealt and handed back to God. */
function rigged(roles: Role[], extra: Partial<Settings> = {}): GameState {
  const settings: Settings = {
    mafiaCount: roles.filter((r) => r === "mafia").length,
    doctor: roles.includes("doctor"),
    detective: roles.includes("detective"),
    revealOnDeath: true,
    dayTimerSec: 180,
    ...extra,
  };
  let s = createGame({ gameId: "g1", roomId: "r1", god, seats: seats(roles.length), settings, rng: Math.random });
  s = { ...s, roles: Object.fromEntries(roles.map((r, i) => [`s${i + 1}`, r])) };
  while (currentDealee(s)) s = confirmRole(s);
  return s;
}

/** Plays one night with the given picks and lands on dawn. */
function night(s: GameState, picks: { mafia?: string | null; doctor?: string | null; detective?: string | null }) {
  let next = beginNight(s);
  next = updateDraft(next, {
    mafia: picks.mafia ?? null,
    doctor: picks.doctor ?? null,
    detective: picks.detective ?? null,
  });
  return commitNight(next);
}

/** Runs the day and the vote; `out` gets a clean majority, or nobody if null. */
function day(s: GameState, out: string | null) {
  let next = openVote(startDay(s));
  const alive = walk(next).alive.size;
  next = commitVote(next, out ? [{ seatId: out, hands: majorityOf(alive) }] : []);
  return next;
}

// s1, s2 mafia · s3 doctor · s4 detective · s5–s8 villagers
const EIGHT: Role[] = ["mafia", "mafia", "doctor", "detective", "villager", "villager", "villager", "villager"];

describe("setup", () => {
  it("suggests mafia by table size and caps at a third", () => {
    expect([5, 6, 7, 9, 10, 12, 13, 16].map(suggestedMafia)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    expect(maxMafia(5)).toBe(1);
    expect(maxMafia(7)).toBe(2);
    expect(maxMafia(16)).toBe(5);
    expect(defaultSettings(5).detective).toBe(false);
    expect(defaultSettings(6).detective).toBe(true);
  });

  it("deals exactly the configured roles and keeps God out", () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const s = createGame({
        gameId: "g",
        roomId: "r",
        god,
        seats: seats(10),
        settings: defaultSettings(10),
        rng: Math.random,
      });
      const roles = Object.values(s.roles);
      expect(roles.filter((r) => r === "mafia")).toHaveLength(3);
      expect(roles.filter((r) => r === "doctor")).toHaveLength(1);
      expect(roles.filter((r) => r === "detective")).toHaveLength(1);
      expect(s.roles.god).toBeUndefined();
      expect(() => validateSetup(s)).not.toThrow();
    }
  });

  it("clamps an over-eager mafia count and rejects bad tables", () => {
    const s = createGame({
      gameId: "g",
      roomId: "r",
      god,
      seats: seats(6),
      settings: { ...defaultSettings(6), mafiaCount: 4 },
      rng: Math.random,
    });
    expect(s.settings.mafiaCount).toBe(1);
    expect(() =>
      createGame({ gameId: "g", roomId: "r", god, seats: seats(4), settings: defaultSettings(4), rng: Math.random }),
    ).toThrow();
    expect(() =>
      createGame({
        gameId: "g",
        roomId: "r",
        god: seats(5)[0],
        seats: seats(5),
        settings: defaultSettings(5),
        rng: Math.random,
      }),
    ).toThrow();
  });

  it("catches a tampered deal", () => {
    const s = rigged(EIGHT);
    expect(() => validateSetup({ ...s, roles: { ...s.roles, s5: "mafia" } })).toThrow();
    expect(() => validateSetup({ ...s, roles: { ...s.roles, s3: "villager" } })).toThrow();
  });
});

describe("deal", () => {
  it("passes the phone round every player, then back to God", () => {
    let s = createGame({
      gameId: "g",
      roomId: "r",
      god,
      seats: seats(6),
      settings: defaultSettings(6),
      rng: Math.random,
    });
    const order: string[] = [];
    while (currentDealee(s)) {
      order.push(currentDealee(s)!.seatId);
      s = confirmRole(s);
    }
    expect(order).toEqual(["s1", "s2", "s3", "s4", "s5", "s6"]);
    expect(s.phase).toBe("handback");
  });

  it("shows mafia their partners and nobody else", () => {
    const s = rigged(EIGHT);
    expect(partnersOf(s, "s1").map((p) => p.seatId)).toEqual(["s2"]);
    expect(partnersOf(s, "s5")).toEqual([]);
  });
});

describe("night", () => {
  it("kills the mafia's target", () => {
    const s = night(rigged(EIGHT), { mafia: "s5" });
    expect(s.phase).toBe("dawn");
    expect(walk(s).alive.has("s5")).toBe(false);
    expect(walk(s).fates.get("s5")).toMatchObject({ cause: "night", at: 1 });
  });

  it("lets the doctor cancel the hit", () => {
    const s = night(rigged(EIGHT), { mafia: "s5", doctor: "s5" });
    const n = walk(s).story[0];
    expect(walk(s).alive.has("s5")).toBe(true);
    expect(n).toMatchObject({ kind: "night", saved: true, killed: null });
  });

  it("allows a night with no kill", () => {
    const s = night(rigged(EIGHT), { mafia: null });
    expect(walk(s).alive.size).toBe(8);
  });

  it("lets the mafia hit their own, but never a dead player", () => {
    const own = night(rigged(EIGHT), { mafia: "s2" });
    expect(walk(own).fates.get("s2")).toMatchObject({ cause: "night" });
    expect(targetsFor(beginNight(rigged(EIGHT)), "mafia").find((t) => t.seat.seatId === "s1")).toMatchObject({
      disabled: false,
      note: "Family",
    });
    const s = day(night(rigged(EIGHT), { mafia: "s5" }), null);
    expect(() => night(s, { mafia: "s5" })).toThrow();
  });

  it("hands the town the win if the last mafioso hits themselves", () => {
    const s = night(rigged(["mafia", "villager", "villager", "villager", "villager"]), { mafia: "s1" });
    expect(winnerOf(s)).toBe("town");
  });

  it("blocks the doctor protecting the same player two nights running", () => {
    let s = day(night(rigged(EIGHT), { mafia: "s5", doctor: "s6" }), null);
    expect(() => night(s, { mafia: "s7", doctor: "s6" })).toThrow();
    s = day(night(s, { mafia: "s7", doctor: "s8" }), null);
    expect(() => night(s, { mafia: "s8", doctor: "s6" })).not.toThrow();
  });

  it("follows the room's self-save rule", () => {
    const never = rigged(EIGHT, { doctorSelfSave: "never" });
    expect(() => night(never, { mafia: "s5", doctor: "s3" })).toThrow();
    expect(targetsFor(beginNight(never), "doctor").find((t) => t.seat.seatId === "s3")).toMatchObject({
      disabled: true,
    });

    let always = rigged(EIGHT, { doctorSelfSave: "always" });
    always = day(night(always, { mafia: "s3", doctor: "s3" }), null);
    always = day(night(always, { mafia: "s5", doctor: "s6" }), null);
    expect(() => night(always, { mafia: "s3", doctor: "s3" })).not.toThrow();
  });

  it("gives the doctor one self-save per game", () => {
    let s = day(night(rigged(EIGHT), { mafia: "s3", doctor: "s3" }), null);
    expect(walk(s).alive.has("s3")).toBe(true);
    s = day(night(s, { mafia: "s5", doctor: "s6" }), null);
    expect(() => night(s, { mafia: "s7", doctor: "s3" })).toThrow();
    const targets = targetsFor(beginNight(s), "doctor");
    expect(targets.find((t) => t.seat.seatId === "s3")).toMatchObject({ disabled: true, note: "Self-save used" });
  });

  it("tells God what the detective found, and blocks self-checks", () => {
    const s = night(rigged(EIGHT), { mafia: "s5", detective: "s1" });
    expect(walk(s).story[0]).toMatchObject({ foundMafia: true });
    expect(walk(s).checks.get("s1")).toBe(true);
    expect(() => night(rigged(EIGHT), { detective: "s4" })).toThrow();
    const clean = night(rigged(EIGHT), { detective: "s6" });
    expect(walk(clean).story[0]).toMatchObject({ foundMafia: false });
  });

  it("refuses picks for a role that isn't in the game or is dead", () => {
    const noDoc = rigged(["mafia", "detective", "villager", "villager", "villager", "villager"]);
    expect(() => night(noDoc, { mafia: "s3", doctor: "s4" })).toThrow();

    let s = day(night(rigged(EIGHT), { mafia: "s3" }), null); // doctor dies night 1
    expect(() => night(s, { mafia: "s5", doctor: "s5" })).toThrow();
    s = night(s, { mafia: "s5" });
    expect(walk(s).alive.has("s5")).toBe(false);
  });

  it("still calls dead roles every night, flagged as pretend", () => {
    const s = day(night(rigged(EIGHT), { mafia: "s3" }), null);
    const steps = nightSteps(beginNight(s));
    expect(steps.map((st) => st.role)).toEqual(["mafia", "doctor", "detective"]);
    expect(steps.find((st) => st.role === "doctor")?.pretend).toBe(true);
    expect(steps.find((st) => st.role === "detective")?.pretend).toBe(false);
  });

  it("only calls roles that were dealt", () => {
    const s = rigged(["mafia", "villager", "villager", "villager", "villager"]);
    expect(nightSteps(beginNight(s)).map((st) => st.role)).toEqual(["mafia"]);
  });

  it("keeps nights and days alternating", () => {
    const s = night(rigged(EIGHT), { mafia: "s5" });
    expect(() => beginNight({ ...s, phase: "verdict" })).toThrow();
  });
});

describe("day vote", () => {
  it("by default, the most hands goes — even short of a majority", () => {
    expect(
      voteOutcome(
        [
          { seatId: "a", hands: 3 },
          { seatId: "b", hands: 2 },
          { seatId: "c", hands: 1 },
        ],
        6,
        "most",
      ),
    ).toBe("a");
    expect(
      voteOutcome(
        [
          { seatId: "a", hands: 2 },
          { seatId: "b", hands: 2 },
        ],
        6,
        "most",
      ),
    ).toBeNull();
    expect(voteOutcome([], 6, "most")).toBeNull();

    // the same table under a strict-majority room spares everyone
    let s = openVote(startDay(night(rigged(EIGHT), { mafia: "s5" })));
    const v = commitVote(s, [
      { seatId: "s1", hands: 3 },
      { seatId: "s6", hands: 2 },
    ]);
    expect(walk(v).story.at(-1)).toMatchObject({ out: "s1" });

    s = openVote(startDay(night(rigged(EIGHT, { voteRule: "majority" }), { mafia: "s5" })));
    const strict = commitVote(s, [
      { seatId: "s1", hands: 3 },
      { seatId: "s6", hands: 2 },
    ]);
    expect(walk(strict).story.at(-1)).toMatchObject({ out: null });
  });

  it("adds time to the day without restarting the clock", () => {
    const d = startDay(night(rigged(EIGHT), { mafia: "s5" }), "2026-10-07T20:00:00.000Z");
    const longer = extendDay(extendDay(d));
    expect(longer.dayStartedAt).toBe("2026-10-07T20:00:00.000Z");
    expect(longer.dayBonusSec).toBe(120);
  });

  it("needs a majority of the living", () => {
    expect([5, 6, 7, 8].map(majorityOf)).toEqual([3, 4, 4, 5]);
    expect(voteOutcome([{ seatId: "a", hands: 4 }], 7)).toBe("a");
    expect(voteOutcome([{ seatId: "a", hands: 3 }], 7)).toBeNull();
    expect(
      voteOutcome(
        [
          { seatId: "a", hands: 3 },
          { seatId: "b", hands: 3 },
        ],
        6,
      ),
    ).toBeNull();
  });

  it("eliminates on a majority and spares on a split", () => {
    let s = night(rigged(EIGHT), { mafia: "s5" }); // 7 alive
    s = openVote(startDay(s));
    const split = commitVote(s, [
      { seatId: "s1", hands: 3 },
      { seatId: "s6", hands: 3 },
    ]);
    expect(walk(split).story.at(-1)).toMatchObject({ kind: "day", out: null, majority: 4 });

    const majority = commitVote(s, [
      { seatId: "s1", hands: 4 },
      { seatId: "s6", hands: 2 },
    ]);
    expect(walk(majority).fates.get("s1")).toMatchObject({ cause: "vote", at: 1 });
    expect(majority.phase).toBe("verdict");
  });

  it("rejects more hands than living players", () => {
    const s = openVote(startDay(night(rigged(EIGHT), { mafia: "s5" })));
    expect(() =>
      commitVote(s, [
        { seatId: "s1", hands: 5 },
        { seatId: "s2", hands: 3 },
      ]),
    ).toThrow();
  });

  it("drops zero-hand nominees from the record", () => {
    const s = openVote(startDay(night(rigged(EIGHT), { mafia: "s5" })));
    const v = commitVote(s, [
      { seatId: "s1", hands: 0 },
      { seatId: "s6", hands: 2 },
    ]);
    expect(walk(v).story.at(-1)).toMatchObject({ tallies: [{ seatId: "s6", hands: 2 }] });
  });
});

describe("winning", () => {
  it("town wins when the last mafioso is voted out", () => {
    let s = day(night(rigged(EIGHT), { mafia: "s5" }), "s1");
    expect(winnerOf(s)).toBeNull();
    s = day(night(s, { mafia: "s6" }), "s2");
    expect(winnerOf(s)).toBe("town");
    expect(finishGame(s).phase).toBe("over");
  });

  it("mafia wins at parity, straight from the night", () => {
    // 1 mafia vs 2 town after a vote → a kill makes it 1v1
    let s = rigged(["mafia", "villager", "villager", "villager", "villager"]);
    s = day(night(s, { mafia: "s2" }), "s3"); // 1 mafia, 2 town
    expect(winnerOf(s)).toBeNull();
    s = night(s, { mafia: "s4" });
    expect(winnerOf(s)).toBe("mafia");
    expect(() => startDay(s)).toThrow();
  });

  it("refuses anything after the game is won", () => {
    let s = rigged(["mafia", "villager", "villager", "villager", "villager"]);
    s = day(night(s, { mafia: "s2" }), "s1");
    expect(winnerOf(s)).toBe("town");
    expect(() => beginNight(s)).toThrow();
    expect(() =>
      walk({ ...s, events: [...s.events, { t: "night", night: 2, mafia: null, doctor: null, detective: null }] }),
    ).toThrow();
  });

  it("someone leaving can end the game", () => {
    let s = startDay(night(rigged(["mafia", "villager", "villager", "villager", "villager"]), { mafia: "s2" }));
    s = removePlayer(s, "s1");
    expect(winnerOf(s)).toBe("town");
    expect(s.phase).toBe("verdict");
    expect(walk(s).fates.get("s1")).toMatchObject({ cause: "left" });
  });

  it("someone leaving mid-day keeps the day going", () => {
    const s = removePlayer(startDay(night(rigged(EIGHT), { mafia: "s5" })), "s6");
    expect(s.phase).toBe("day");
    expect(walk(s).alive.size).toBe(6);
  });
});

describe("scoring", () => {
  it("pays survival, the win, saves and finds", () => {
    // Night 1: mafia hit s5, doctor saves s5, detective finds s1. Day 1: s1 out.
    // Night 2: mafia (s2) hit s6, doctor on s7, detective finds s2. Day 2: s2 out → town wins.
    let s = rigged(EIGHT);
    s = day(night(s, { mafia: "s5", doctor: "s5", detective: "s1" }), "s1");
    s = day(night(s, { mafia: "s6", doctor: "s7", detective: "s2" }), "s2");
    expect(winnerOf(s)).toBe("town");

    const scores = new Map(scoreGame(s).map((r) => [r.seatId, r]));

    // s3 (doctor) survived 2 nights + 2 votes, won, 1 save
    expect(scores.get("s3")).toMatchObject({
      survived: 4,
      bonus: WIN_BONUS,
      saves: 1,
      points: 4 + WIN_BONUS + SAVE_POINTS,
    });
    // s4 (detective) found 2 distinct mafia
    expect(scores.get("s4")).toMatchObject({ finds: 2, points: 4 + WIN_BONUS + 2 * FIND_POINTS });
    // s6 died night 2: survived night 1 + vote 1
    expect(scores.get("s6")).toMatchObject({ diedNight: 2, survived: 2, won: true, points: 2 + WIN_BONUS });
    // s1 voted out day 1: survived night 1 only, lost
    expect(scores.get("s1")).toMatchObject({ votedOutDay: 1, survived: 1, won: false, bonus: 0, points: 1 });
  });

  it("re-checking the same mafioso only counts once", () => {
    let s = rigged(EIGHT);
    s = day(night(s, { mafia: "s5", detective: "s1" }), null);
    s = day(night(s, { mafia: "s6", detective: "s1" }), "s1");
    s = day(night(s, { mafia: "s7" }), "s2");
    const detective = scoreGame(s).find((r) => r.role === "detective")!;
    expect(detective.finds).toBe(1);
  });

  it("gives surviving mafia the bonus on a mafia win", () => {
    let s = rigged(["mafia", "mafia", "villager", "villager", "villager", "villager", "villager"]);
    s = day(night(s, { mafia: "s3" }), "s1"); // s1 mafia out → 1 mafia vs 4 town... (s4–s7 + s3 dead) = 4
    s = day(night(s, { mafia: "s4" }), null); // 1 vs 3
    s = day(night(s, { mafia: "s5" }), null); // 1 vs 2
    s = night(s, { mafia: "s6" }); // 1 vs 1 → mafia
    expect(winnerOf(s)).toBe("mafia");
    const scores = new Map(scoreGame(s).map((r) => [r.seatId, r]));
    expect(scores.get("s2")!.bonus).toBe(WIN_BONUS + MAFIA_ALIVE_BONUS);
    expect(scores.get("s1")!.bonus).toBe(WIN_BONUS);
    expect(scores.get("s7")!.bonus).toBe(0);
  });

  it("counts peeks without touching the game", () => {
    let s = rigged(EIGHT);
    s = recordPeek(s, "s3");
    s = recordPeek(s, "s3");
    s = day(night(s, { mafia: "s5" }), "s1");
    s = day(night(s, { mafia: "s6" }), "s2");
    expect(scoreGame(s).find((r) => r.seatId === "s3")!.peeks).toBe(2);
  });

  it("hands out awards", () => {
    let s = rigged(EIGHT);
    s = day(night(s, { mafia: "s5", doctor: "s8", detective: "s1" }), "s7");
    s = day(night(s, { mafia: "s6", doctor: "s6" }), "s1");
    s = day(night(s, { mafia: "s8", detective: "s2" }), "s2");
    const awards = new Map(awardsFor(s).map((a) => [a.id, a.seatId]));
    expect(awards.get("first-blood")).toBe("s5");
    expect(awards.get("untouchable")).toBe("s6");
    expect(awards.get("framed")).toBe("s7");
    expect(awards.get("sherlock")).toBe("s4");
    expect(awards.get("cold-blooded")).toBe("s2");
  });
});

describe("undo", () => {
  it("takes back God's last step once", () => {
    const before = beginNight(rigged(EIGHT));
    const drafted = updateDraft(before, { mafia: "s5", step: 3 });
    const dawn = withUndo(drafted, commitNight(drafted));
    expect(walk(dawn).alive.has("s5")).toBe(false);
    const back = undoLast(dawn);
    expect(back.phase).toBe("night");
    expect(back.draft?.mafia).toBe("s5");
    expect(back.events).toHaveLength(0);
    expect(() => undoLast(back)).toThrow();
  });
});

describe("standings & God", () => {
  it("adds up points and narrations", () => {
    const rows = standings(
      [
        { seatId: "a", points: 5, role: "mafia", won: true },
        { seatId: "b", points: 3, role: "villager", won: false },
        { seatId: "a", points: 2, role: "villager", won: false },
      ],
      ["c", "c", "b"],
      ["a", "b", "c"],
    );
    expect(rows.map((r) => r.seatId)).toEqual(["a", "b", "c"]);
    expect(rows[0]).toMatchObject({ points: 7, games: 2, wins: 1, mafiaGames: 1, mafiaWins: 1 });
    expect(rows[2]).toMatchObject({ narrated: 2, games: 0 });
  });

  it("suggests whoever has narrated least", () => {
    expect(
      suggestGod(
        ["a", "b", "c"],
        new Map([
          ["a", 2],
          ["b", 1],
          ["c", 1],
        ]),
      ),
    ).toBe("b");
    expect(suggestGod(["a", "b"], new Map())).toBe("a");
    expect(suggestGod([], new Map())).toBeNull();
  });
});
