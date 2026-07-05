// Pure, UI-independent poker accounting. Every critical settlement value must
// come from these functions, and server actions re-verify with them before
// persisting state transitions. See docs/06_CALCULATION_AND_SETTLEMENT_RULES.md.

export type PlayerResult = {
  gamePlayerId: string;
  netResultMoney: number;
  /** Cash handed to the host up front. Netted into settlement, never into chip math. */
  advanceMoney?: number;
};

export type SettlementLineInput = {
  fromGamePlayerId: string;
  toGamePlayerId: string;
  amount: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function moneyToCoins(moneyAmount: number, ratioMoneyAmount: number, ratioCoinAmount: number): number {
  return Math.round((moneyAmount * ratioCoinAmount) / ratioMoneyAmount);
}

export function coinsToMoney(coinAmount: number, ratioMoneyAmount: number, ratioCoinAmount: number): number {
  return (coinAmount * ratioMoneyAmount) / ratioCoinAmount;
}

export type TallyValidation = {
  totalCoinsIssued: number;
  totalFinalCoins: number;
  /** positive → extra coins on the table, negative → short */
  difference: number;
  matches: boolean;
};

export function validateFinalTally(totalCoinsIssued: number, finalCoinCounts: number[]): TallyValidation {
  const totalFinalCoins = finalCoinCounts.reduce((sum, count) => sum + count, 0);
  const difference = totalFinalCoins - totalCoinsIssued;

  return {
    totalCoinsIssued,
    totalFinalCoins,
    difference,
    matches: difference === 0,
  };
}

export function computeNetResult(
  finalCoinCount: number,
  totalBuyInMoney: number,
  ratioMoneyAmount: number,
  ratioCoinAmount: number,
): { finalValueMoney: number; netResultMoney: number } {
  const finalValueMoney = roundMoney(coinsToMoney(finalCoinCount, ratioMoneyAmount, ratioCoinAmount));

  return {
    finalValueMoney,
    netResultMoney: roundMoney(finalValueMoney - totalBuyInMoney),
  };
}

/**
 * Applies advances on top of chip-based net results.
 *
 * A player who handed the host cash up front has effectively pre-settled that
 * amount, so their remaining position improves by the advance. The host holds
 * that cash, so the host's position carries the offsetting total — keeping the
 * whole table zero-sum.
 *
 * Requires a host game player whenever any advance exists.
 */
export function applyAdvances(results: PlayerResult[], hostGamePlayerId: string | null): PlayerResult[] {
  const totalAdvances = roundMoney(results.reduce((sum, r) => sum + (r.advanceMoney ?? 0), 0));

  if (totalAdvances === 0) {
    return results.map((r) => ({ gamePlayerId: r.gamePlayerId, netResultMoney: roundMoney(r.netResultMoney) }));
  }

  if (!hostGamePlayerId || !results.some((r) => r.gamePlayerId === hostGamePlayerId)) {
    throw new Error("Advances were recorded, so the host must be seated as a player to settle them.");
  }

  return results.map((r) => {
    let effective = r.netResultMoney + (r.advanceMoney ?? 0);

    if (r.gamePlayerId === hostGamePlayerId) {
      effective -= totalAdvances;
    }

    return { gamePlayerId: r.gamePlayerId, netResultMoney: roundMoney(effective) };
  });
}

/** Splitwise-style simplification: losers pay winners directly, fewest lines. */
export function generateDirectSettlement(results: PlayerResult[]): SettlementLineInput[] {
  const creditors = results
    .filter((r) => r.netResultMoney > 0)
    .map((r) => ({ gamePlayerId: r.gamePlayerId, amount: roundMoney(r.netResultMoney) }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = results
    .filter((r) => r.netResultMoney < 0)
    .map((r) => ({ gamePlayerId: r.gamePlayerId, amount: roundMoney(Math.abs(r.netResultMoney)) }))
    .sort((a, b) => b.amount - a.amount);

  const lines: SettlementLineInput[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

    if (amount > 0) {
      lines.push({ fromGamePlayerId: debtor.gamePlayerId, toGamePlayerId: creditor.gamePlayerId, amount });
    }

    debtor.amount = roundMoney(debtor.amount - amount);
    creditor.amount = roundMoney(creditor.amount - amount);

    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return lines;
}

/** Every loser pays the host; the host pays every winner. */
export function generateHostSettlement(results: PlayerResult[], hostGamePlayerId: string): SettlementLineInput[] {
  const lines: SettlementLineInput[] = [];

  for (const result of results) {
    const amount = roundMoney(Math.abs(result.netResultMoney));

    if (amount === 0) continue;
    if (result.gamePlayerId === hostGamePlayerId) continue;

    if (result.netResultMoney < 0) {
      lines.push({ fromGamePlayerId: result.gamePlayerId, toGamePlayerId: hostGamePlayerId, amount });
    } else {
      lines.push({ fromGamePlayerId: hostGamePlayerId, toGamePlayerId: result.gamePlayerId, amount });
    }
  }

  return lines;
}

export function generateSettlement(
  mode: "direct" | "host",
  results: PlayerResult[],
  hostGamePlayerId: string | null,
): SettlementLineInput[] {
  const effective = applyAdvances(results, hostGamePlayerId);

  if (mode === "host") {
    if (!hostGamePlayerId) {
      throw new Error("Host settlement needs the host seated as a player.");
    }

    return generateHostSettlement(effective, hostGamePlayerId);
  }

  return generateDirectSettlement(effective);
}

export function settlementLineStatus(amount: number, paidAmount: number): "pending" | "partially_paid" | "paid" {
  if (paidAmount <= 0) return "pending";
  if (paidAmount < amount) return "partially_paid";
  return "paid";
}
