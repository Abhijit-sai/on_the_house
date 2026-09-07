// Lifetime poker standings across every settled game night.
// Pure and UI-independent so the numbers can be unit tested.

import { roundMoney } from "@/features/settlement/calculations";

/** One player's result from one closed game. */
export type PlayerGameResult = {
  playerId: string;
  name: string;
  colorKey: string | null;
  gameId: string;
  gameName: string;
  playedAt: string;
  netResultMoney: number;
  buyInMoney: number;
};

export type LeaderboardRow = {
  playerId: string;
  name: string;
  colorKey: string | null;
  gamesPlayed: number;
  nightsWon: number;
  nightsLost: number;
  lifetimeNet: number;
  totalBuyIn: number;
  averageNet: number;
  bestNight: { amount: number; gameName: string } | null;
  worstNight: { amount: number; gameName: string } | null;
  /** Most recent nights first, newest at index 0. */
  form: number[];
};

const FORM_LENGTH = 5;

export function buildLeaderboard(results: PlayerGameResult[]): LeaderboardRow[] {
  const byPlayer = new Map<string, PlayerGameResult[]>();

  for (const result of results) {
    const list = byPlayer.get(result.playerId) ?? [];
    list.push(result);
    byPlayer.set(result.playerId, list);
  }

  const rows: LeaderboardRow[] = [];

  for (const [playerId, own] of byPlayer) {
    // Newest first so "form" reads left-to-right as most recent.
    const chronological = [...own].sort((a, b) => (a.playedAt < b.playedAt ? -1 : 1));
    const newestFirst = [...chronological].reverse();

    const lifetimeNet = roundMoney(own.reduce((sum, r) => sum + r.netResultMoney, 0));
    const totalBuyIn = roundMoney(own.reduce((sum, r) => sum + r.buyInMoney, 0));

    let best: PlayerGameResult | null = null;
    let worst: PlayerGameResult | null = null;

    for (const result of own) {
      if (result.netResultMoney > 0 && (!best || result.netResultMoney > best.netResultMoney)) best = result;
      if (result.netResultMoney < 0 && (!worst || result.netResultMoney < worst.netResultMoney)) worst = result;
    }

    rows.push({
      playerId,
      name: own[0].name,
      colorKey: own[0].colorKey,
      gamesPlayed: own.length,
      nightsWon: own.filter((r) => r.netResultMoney > 0).length,
      nightsLost: own.filter((r) => r.netResultMoney < 0).length,
      lifetimeNet,
      totalBuyIn,
      averageNet: own.length > 0 ? roundMoney(lifetimeNet / own.length) : 0,
      bestNight: best ? { amount: roundMoney(best.netResultMoney), gameName: best.gameName } : null,
      worstNight: worst ? { amount: roundMoney(worst.netResultMoney), gameName: worst.gameName } : null,
      form: newestFirst.slice(0, FORM_LENGTH).map((r) => r.netResultMoney),
    });
  }

  return rows.sort(
    (a, b) =>
      b.lifetimeNet - a.lifetimeNet ||
      b.gamesPlayed - a.gamesPlayed ||
      a.name.localeCompare(b.name),
  );
}

export type LeaderboardSummary = {
  gamesSettled: number;
  volumeTracked: number;
  topWinner: LeaderboardRow | null;
  biggestLoser: LeaderboardRow | null;
  bestSingleNight: { name: string; amount: number; gameName: string } | null;
};

export function summarise(rows: LeaderboardRow[], gamesSettled: number): LeaderboardSummary {
  const volumeTracked = roundMoney(rows.reduce((sum, r) => sum + r.totalBuyIn, 0));

  let bestSingleNight: LeaderboardSummary["bestSingleNight"] = null;

  for (const row of rows) {
    if (row.bestNight && (!bestSingleNight || row.bestNight.amount > bestSingleNight.amount)) {
      bestSingleNight = { name: row.name, amount: row.bestNight.amount, gameName: row.bestNight.gameName };
    }
  }

  const winners = rows.filter((r) => r.lifetimeNet > 0);
  const losers = rows.filter((r) => r.lifetimeNet < 0);

  return {
    gamesSettled,
    volumeTracked,
    topWinner: winners.length > 0 ? winners[0] : null,
    biggestLoser: losers.length > 0 ? losers[losers.length - 1] : null,
    bestSingleNight,
  };
}
