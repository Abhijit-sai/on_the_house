import { describe, expect, it } from "vitest";
import {
  IMPOSTER_WIN_BONUS,
  aliveSeats,
  cardOf,
  claimCard,
  clueOrder,
  createGame,
  currentDrawer,
  dealComplete,
  finishGame,
  maxImposters,
  nextClue,
  pickPair,
  recordPeek,
  scoreGame,
  standings,
  startRound,
  suggestedImposters,
  voteOut,
  wonGame,
  type GameState,
  type Rng,
  type Seat,
} from "@/features/imposter/engine";
import { MIXED_CATEGORY_ID, WORD_CATEGORIES, pairKey, pairsFor, totalPairCount } from "@/features/imposter/words";

/** Deterministic rng: cycles through the given values. */
function seq(...values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

const seats = (n: number): Seat[] =>
  Array.from({ length: n }, (_, i) => ({ seatId: `s${i + 1}`, name: `P${i + 1}`, colorKey: null }));

const pair = { categoryId: "food", categoryLabel: "Food", words: ["Chai", "Coffee"] as const };

function newGame(n = 6, imposterCount = 1, rng: Rng = Math.random) {
  return createGame({ gameId: "g1", roomId: "r1", seats: seats(n), imposterCount, pair, rng });
}

/** Everyone draws the first free card in seat order. */
function dealAll(state: GameState) {
  let s = state;
  while (!dealComplete(s)) s = claimCard(s, s.cards.findIndex((c) => !c.claimedBy));
  return s;
}

function imposterSeats(state: GameState) {
  return state.seats.filter((s) => cardOf(state, s.seatId)?.role === "imposter").map((s) => s.seatId);
}

function civilianSeats(state: GameState) {
  return state.seats.filter((s) => cardOf(state, s.seatId)?.role === "civilian").map((s) => s.seatId);
}

describe("word bank", () => {
  it("has no duplicate pairs and no pair of identical words", () => {
    const keys = WORD_CATEGORIES.flatMap((c) => c.pairs.map(([a, b]) => pairKey(a, b)));
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of WORD_CATEGORIES) for (const [a, b] of c.pairs) expect(a.toLowerCase()).not.toBe(b.toLowerCase());
  });

  it("mixed draws from every category", () => {
    expect(pairsFor(MIXED_CATEGORY_ID)).toHaveLength(totalPairCount());
    expect(totalPairCount()).toBeGreaterThan(150);
  });

  it("pickPair avoids pairs the room already played, then recycles once exhausted", () => {
    const food = pairsFor("food");
    const used = food.slice(1).map((p) => pairKey(p.words[0], p.words[1]));
    expect(pickPair("food", used, seq(0.99)).words).toEqual(food[0].words);

    const allUsed = food.map((p) => pairKey(p.words[1], p.words[0])); // order-insensitive keys
    expect(food.map((p) => p.words)).toContainEqual(pickPair("food", allUsed, seq(0.5)).words);
  });
});

describe("setup", () => {
  it("caps imposters so civilians always start in the majority", () => {
    expect(maxImposters(3)).toBe(1);
    expect(maxImposters(5)).toBe(2);
    expect(maxImposters(8)).toBe(3);
    expect(suggestedImposters(6)).toBe(1);
    expect(suggestedImposters(8)).toBe(2);
    expect(suggestedImposters(12)).toBe(3);
    expect(newGame(4, 5).imposterCount).toBe(1);
  });

  it("deals exactly one card per player with the requested imposters holding the other word", () => {
    const g = newGame(8, 2);
    expect(g.cards).toHaveLength(8);
    const imposters = g.cards.filter((c) => c.role === "imposter");
    expect(imposters).toHaveLength(2);
    expect(new Set(imposters.map((c) => c.word))).toEqual(new Set([g.imposterWord]));
    expect(new Set(g.cards.filter((c) => c.role === "civilian").map((c) => c.word))).toEqual(new Set([g.civilianWord]));
    expect(new Set([g.civilianWord, g.imposterWord])).toEqual(new Set(["Chai", "Coffee"]));
  });

  it("either word of the pair can be the imposter's", () => {
    expect(newGame(6, 1, seq(0.1)).imposterWord).toBe("Chai");
    expect(newGame(6, 1, seq(0.9)).imposterWord).toBe("Coffee");
  });

  it("rejects too few players and duplicate seats", () => {
    expect(() => newGame(2)).toThrow();
    expect(() =>
      createGame({ gameId: "g", roomId: "r", seats: [...seats(3), seats(1)[0]], imposterCount: 1, pair, rng: Math.random }),
    ).toThrow();
  });
});

describe("the deal", () => {
  it("passes the phone in seat order and stamps each drawn card with its owner", () => {
    let g = newGame(4);
    expect(currentDrawer(g)?.seatId).toBe("s1");
    g = claimCard(g, 2);
    expect(g.cards[2].claimedBy).toBe("s1");
    expect(currentDrawer(g)?.seatId).toBe("s2");
    expect(() => claimCard(g, 2)).toThrow(/already taken/);
    g = dealAll(g);
    expect(dealComplete(g)).toBe(true);
    expect(currentDrawer(g)).toBeNull();
    expect(new Set(g.cards.map((c) => c.claimedBy))).toEqual(new Set(["s1", "s2", "s3", "s4"]));
  });

  it("can't start a round until everyone has drawn", () => {
    expect(() => startRound(claimCard(newGame(4), 0), seq(0))).toThrow(/drawn/);
  });

  it("counts peeks only for players who hold a card", () => {
    let g = claimCard(newGame(4), 0);
    g = recordPeek(recordPeek(g, "s1"), "s1");
    expect(g.peeks.s1).toBe(2);
    expect(() => recordPeek(g, "s3")).toThrow();
  });
});

describe("rounds", () => {
  it("starts clues from a random player and goes round in seat order", () => {
    const g = startRound(dealAll(newGame(5)), seq(0.5)); // index 2 → s3
    expect(g.round).toBe(1);
    expect(clueOrder(g).map((s) => s.seatId)).toEqual(["s3", "s4", "s5", "s1", "s2"]);
  });

  it("skips players who are out and moves to the vote after the last clue", () => {
    let g = startRound(dealAll(newGame(5)), seq(0));
    const civ = civilianSeats(g)[0];
    for (let i = 0; i < 5; i += 1) g = nextClue(g);
    expect(g.phase).toBe("vote");
    g = voteOut(g, civ);
    g = startRound(g, seq(0));
    expect(clueOrder(g).map((s) => s.seatId)).not.toContain(civ);
    expect(clueOrder(g)).toHaveLength(4);
  });

  it("can't vote someone out twice or outside the vote", () => {
    let g = startRound(dealAll(newGame(6)), seq(0));
    expect(() => voteOut(g, "s1")).toThrow(/time to vote/);
    g = { ...g, phase: "vote" };
    const civ = civilianSeats(g)[0];
    g = voteOut(g, civ);
    g = { ...startRound(g, seq(0)), phase: "vote" };
    expect(() => voteOut(g, civ)).toThrow(/already out/);
  });
});

function playOut(g: GameState, targets: string[]) {
  let s = g;
  for (const target of targets) {
    s = { ...startRound(s, seq(0)), phase: "vote" };
    s = voteOut(s, target);
    if (s.winner) break;
  }
  return s;
}

describe("win conditions", () => {
  it("civilians win the moment the last imposter is voted out", () => {
    const g = dealAll(newGame(6, 1));
    const end = playOut(g, [civilianSeats(g)[0], imposterSeats(g)[0]]);
    expect(end.winner).toBe("civilians");
    expect(end.round).toBe(2);
    expect(finishGame(end).phase).toBe("over");
  });

  it("the imposter wins by surviving until one civilian is left", () => {
    const g = dealAll(newGame(4, 1));
    const civs = civilianSeats(g);
    let s = playOut(g, [civs[0]]);
    expect(s.winner).toBeNull();
    s = playOut(s, [civs[1]]);
    expect(s.winner).toBe("imposters");
    expect(aliveSeats(s)).toHaveLength(2);
  });

  it("with two imposters, catching one isn't enough", () => {
    const g = dealAll(newGame(8, 2));
    const [i1, i2] = imposterSeats(g);
    const s = playOut(g, [i1]);
    expect(s.winner).toBeNull();
    expect(playOut(s, [i2]).winner).toBe("civilians");
  });

  it("in a 3-player game one wrong vote hands it to the imposter", () => {
    const g = dealAll(newGame(3, 1));
    expect(playOut(g, [civilianSeats(g)[0]]).winner).toBe("imposters");
  });

  it("won't finish a game without a winner", () => {
    expect(() => finishGame(dealAll(newGame(5)))).toThrow();
  });
});

describe("scoring", () => {
  it("civilians earn a point per vote survived; a caught imposter keeps the rounds they fooled the table", () => {
    const g = dealAll(newGame(6, 1));
    const civs = civilianSeats(g);
    const imp = imposterSeats(g)[0];
    const end = playOut(g, [civs[0], civs[1], imp]);
    const scores = new Map(scoreGame(end).map((s) => [s.seatId, s]));

    expect(scores.get(civs[0])).toMatchObject({ eliminatedRound: 1, roundsSurvived: 0, points: 0 });
    expect(scores.get(civs[1])).toMatchObject({ eliminatedRound: 2, roundsSurvived: 1, points: 1 });
    expect(scores.get(civs[2])).toMatchObject({ eliminatedRound: null, roundsSurvived: 3, points: 3 });
    expect(scores.get(imp)).toMatchObject({ role: "imposter", eliminatedRound: 3, roundsSurvived: 2, bonus: 0, points: 2 });
  });

  it("a surviving imposter always tops the game", () => {
    const g = dealAll(newGame(7, 1));
    const civs = civilianSeats(g);
    const imp = imposterSeats(g)[0];
    const end = playOut(g, civs.slice(0, 5));
    expect(end.winner).toBe("imposters");

    const scores = scoreGame(end);
    const impScore = scores.find((s) => s.seatId === imp)!;
    expect(impScore.bonus).toBe(IMPOSTER_WIN_BONUS);
    expect(impScore.points).toBe(end.round + IMPOSTER_WIN_BONUS);
    for (const s of scores) if (s.seatId !== imp) expect(s.points).toBeLessThan(impScore.points);
  });

  it("an imposter voted out doesn't share the team's victory bonus", () => {
    // 8 players, 2 imposters: one caught early, the other survives to the end.
    const g = dealAll(newGame(8, 2));
    const [caught, survivor] = imposterSeats(g);
    const civs = civilianSeats(g);
    const end = playOut(g, [caught, ...civs.slice(0, 5)]);
    expect(end.winner).toBe("imposters");
    const scores = new Map(scoreGame(end).map((s) => [s.seatId, s]));
    expect(scores.get(caught)!.bonus).toBe(0);
    expect(scores.get(survivor)!.bonus).toBe(IMPOSTER_WIN_BONUS);
  });

  it("refuses to score an unfinished game", () => {
    expect(() => scoreGame(dealAll(newGame(5)))).toThrow();
  });

  it("room standings add up across games and rank by points, then wins", () => {
    const rows = [
      { seatId: "a", points: 3, role: "civilian" as const, won: true },
      { seatId: "b", points: 8, role: "imposter" as const, won: true },
      { seatId: "a", points: 2, role: "imposter" as const, won: false },
      { seatId: "c", points: 5, role: "civilian" as const, won: true },
    ];
    const table = standings(rows, ["a", "b", "c", "d"]);
    expect(table.map((r) => r.seatId)).toEqual(["b", "a", "c", "d"]);
    expect(table[1]).toMatchObject({ points: 5, games: 2, wins: 1, imposterGames: 1, imposterWins: 0 });
    expect(table[3]).toMatchObject({ points: 0, games: 0 });
  });

  it("wonGame reads the role against the winning side", () => {
    expect(wonGame("imposter", "imposters")).toBe(true);
    expect(wonGame("civilian", "imposters")).toBe(false);
    expect(wonGame("civilian", "civilians")).toBe(true);
  });
});
