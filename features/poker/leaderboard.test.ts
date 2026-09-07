import { describe, expect, it } from "vitest";
import { buildLeaderboard, summarise, type PlayerGameResult } from "./leaderboard";

const night = (
  playerId: string,
  name: string,
  gameName: string,
  playedAt: string,
  net: number,
  buyIn = 1000,
): PlayerGameResult => ({
  playerId,
  name,
  colorKey: null,
  gameId: gameName,
  gameName,
  playedAt,
  netResultMoney: net,
  buyInMoney: buyIn,
});

describe("poker leaderboard", () => {
  it("ranks by lifetime net, not by number of wins", () => {
    const rows = buildLeaderboard([
      // Steady grinder: three small wins.
      night("a", "Ann", "N1", "2026-01-01", 300),
      night("a", "Ann", "N2", "2026-01-08", 300),
      night("a", "Ann", "N3", "2026-01-15", 300),
      // One huge night beats three small ones.
      night("b", "Bo", "N1", "2026-01-01", 2000),
      night("b", "Bo", "N2", "2026-01-08", -500),
    ]);

    expect(rows.map((r) => r.name)).toEqual(["Bo", "Ann"]);
    expect(rows[0].lifetimeNet).toBe(1500);
    expect(rows[1].lifetimeNet).toBe(900);
  });

  it("counts nights won and lost, ignoring break-even nights", () => {
    const rows = buildLeaderboard([
      night("a", "Ann", "N1", "2026-01-01", 500),
      night("a", "Ann", "N2", "2026-01-08", 0),
      night("a", "Ann", "N3", "2026-01-15", -200),
    ]);

    expect(rows[0].gamesPlayed).toBe(3);
    expect(rows[0].nightsWon).toBe(1);
    expect(rows[0].nightsLost).toBe(1);
    expect(rows[0].lifetimeNet).toBe(300);
    expect(rows[0].averageNet).toBe(100);
  });

  it("tracks best and worst nights with the game they happened in", () => {
    const rows = buildLeaderboard([
      night("a", "Ann", "Quiet Tuesday", "2026-01-01", 200),
      night("a", "Ann", "Big Friday", "2026-01-08", 4000),
      night("a", "Ann", "Rough Sunday", "2026-01-15", -1800),
    ]);

    expect(rows[0].bestNight).toEqual({ amount: 4000, gameName: "Big Friday" });
    expect(rows[0].worstNight).toEqual({ amount: -1800, gameName: "Rough Sunday" });
  });

  it("form lists the most recent nights first", () => {
    const rows = buildLeaderboard([
      night("a", "Ann", "N1", "2026-01-01", 100),
      night("a", "Ann", "N2", "2026-01-08", 200),
      night("a", "Ann", "N3", "2026-01-15", 300),
    ]);

    expect(rows[0].form).toEqual([300, 200, 100]);
  });

  it("form keeps only the last five nights", () => {
    const rows = buildLeaderboard(
      Array.from({ length: 8 }, (_, i) =>
        night("a", "Ann", `N${i}`, `2026-01-0${i + 1}`, i),
      ),
    );

    expect(rows[0].form).toHaveLength(5);
    expect(rows[0].form[0]).toBe(7);
  });

  it("a player who never won has no best night", () => {
    const rows = buildLeaderboard([night("a", "Ann", "N1", "2026-01-01", -500)]);

    expect(rows[0].bestNight).toBeNull();
    expect(rows[0].worstNight).toEqual({ amount: -500, gameName: "N1" });
  });

  it("summarises the table's top winner, biggest loser and best single night", () => {
    const rows = buildLeaderboard([
      night("a", "Ann", "N1", "2026-01-01", 2500),
      night("b", "Bo", "N1", "2026-01-01", -1500),
      night("c", "Cy", "N1", "2026-01-01", -1000),
    ]);
    const summary = summarise(rows, 1);

    expect(summary.topWinner?.name).toBe("Ann");
    expect(summary.biggestLoser?.name).toBe("Bo");
    expect(summary.bestSingleNight).toEqual({ name: "Ann", amount: 2500, gameName: "N1" });
    expect(summary.volumeTracked).toBe(3000);
    expect(summary.gamesSettled).toBe(1);
  });

  it("an all-square table has no winner or loser", () => {
    const rows = buildLeaderboard([
      night("a", "Ann", "N1", "2026-01-01", 0),
      night("b", "Bo", "N1", "2026-01-01", 0),
    ]);
    const summary = summarise(rows, 1);

    expect(summary.topWinner).toBeNull();
    expect(summary.biggestLoser).toBeNull();
  });

  it("handles an empty history", () => {
    expect(buildLeaderboard([])).toEqual([]);
    expect(summarise([], 0).topWinner).toBeNull();
  });
});
