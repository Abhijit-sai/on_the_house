import { describe, expect, it } from "vitest";
import {
  applyAdvances,
  coinsToMoney,
  computeNetResult,
  generateDirectSettlement,
  generateHostSettlement,
  generateSettlement,
  moneyToCoins,
  settlementLineStatus,
  validateFinalTally,
} from "./calculations";

// Required tests from docs/06_CALCULATION_AND_SETTLEMENT_RULES.md section 19.

describe("conversions", () => {
  it("moneyToCoins(500, 1000, 2000) = 1000", () => {
    expect(moneyToCoins(500, 1000, 2000)).toBe(1000);
  });

  it("coinsToMoney(1000, 1000, 2000) = 500", () => {
    expect(coinsToMoney(1000, 1000, 2000)).toBe(500);
  });
});

describe("final tally validation", () => {
  it("matches when final coins equal issued coins", () => {
    const result = validateFinalTally(4000, [3600, 400]);
    expect(result.matches).toBe(true);
    expect(result.difference).toBe(0);
  });

  it("mismatch blocks with the difference reported", () => {
    const short = validateFinalTally(4000, [3600, 200]);
    expect(short.matches).toBe(false);
    expect(short.difference).toBe(-200);

    const extra = validateFinalTally(4000, [3600, 600]);
    expect(extra.matches).toBe(false);
    expect(extra.difference).toBe(200);
  });
});

describe("net results", () => {
  it("net positive result", () => {
    const result = computeNetResult(3600, 1000, 1000, 2000);
    expect(result.finalValueMoney).toBe(1800);
    expect(result.netResultMoney).toBe(800);
  });

  it("net negative result", () => {
    const result = computeNetResult(400, 1000, 1000, 2000);
    expect(result.finalValueMoney).toBe(200);
    expect(result.netResultMoney).toBe(-800);
  });

  it("net zero result", () => {
    const result = computeNetResult(2000, 1000, 1000, 2000);
    expect(result.netResultMoney).toBe(0);
  });
});

describe("direct settlement", () => {
  it("one debtor and one creditor", () => {
    const lines = generateDirectSettlement([
      { gamePlayerId: "A", netResultMoney: 800 },
      { gamePlayerId: "B", netResultMoney: -800 },
    ]);
    expect(lines).toEqual([{ fromGamePlayerId: "B", toGamePlayerId: "A", amount: 800 }]);
  });

  it("multiple debtors and creditors (docs example)", () => {
    const lines = generateDirectSettlement([
      { gamePlayerId: "A", netResultMoney: 1000 },
      { gamePlayerId: "B", netResultMoney: 500 },
      { gamePlayerId: "C", netResultMoney: -700 },
      { gamePlayerId: "D", netResultMoney: -800 },
    ]);
    expect(lines).toEqual([
      { fromGamePlayerId: "D", toGamePlayerId: "A", amount: 800 },
      { fromGamePlayerId: "C", toGamePlayerId: "A", amount: 200 },
      { fromGamePlayerId: "C", toGamePlayerId: "B", amount: 500 },
    ]);
  });

  it("break-even players produce no lines for themselves", () => {
    const lines = generateDirectSettlement([
      { gamePlayerId: "A", netResultMoney: 300 },
      { gamePlayerId: "B", netResultMoney: 0 },
      { gamePlayerId: "C", netResultMoney: -300 },
    ]);
    expect(lines).toEqual([{ fromGamePlayerId: "C", toGamePlayerId: "A", amount: 300 }]);
  });

  it("all players break even produces no lines", () => {
    expect(
      generateDirectSettlement([
        { gamePlayerId: "A", netResultMoney: 0 },
        { gamePlayerId: "B", netResultMoney: 0 },
      ]),
    ).toEqual([]);
  });
});

describe("host settlement", () => {
  it("host not playing a hand still routes all payments through host seat", () => {
    const lines = generateHostSettlement(
      [
        { gamePlayerId: "A", netResultMoney: 500 },
        { gamePlayerId: "B", netResultMoney: -500 },
        { gamePlayerId: "H", netResultMoney: 0 },
      ],
      "H",
    );
    expect(lines).toEqual([
      { fromGamePlayerId: "H", toGamePlayerId: "A", amount: 500 },
      { fromGamePlayerId: "B", toGamePlayerId: "H", amount: 500 },
    ]);
  });

  it("host as winner receives from losers only", () => {
    const lines = generateHostSettlement(
      [
        { gamePlayerId: "H", netResultMoney: 300 },
        { gamePlayerId: "B", netResultMoney: -300 },
      ],
      "H",
    );
    expect(lines).toEqual([{ fromGamePlayerId: "B", toGamePlayerId: "H", amount: 300 }]);
  });

  it("host as loser pays winners", () => {
    const lines = generateHostSettlement(
      [
        { gamePlayerId: "H", netResultMoney: -400 },
        { gamePlayerId: "B", netResultMoney: 400 },
      ],
      "H",
    );
    expect(lines).toEqual([{ fromGamePlayerId: "H", toGamePlayerId: "B", amount: 400 }]);
  });
});

describe("settlement line status", () => {
  it("partial payment status update", () => {
    expect(settlementLineStatus(1000, 0)).toBe("pending");
    expect(settlementLineStatus(1000, 400)).toBe("partially_paid");
  });

  it("fully paid allows close", () => {
    expect(settlementLineStatus(1000, 1000)).toBe("paid");
  });

  it("pending settlement blocks close", () => {
    expect(settlementLineStatus(1000, 999.99)).toBe("partially_paid");
  });
});

describe("advances", () => {
  it("loser's advance reduces what they owe; host offset keeps zero-sum", () => {
    const adjusted = applyAdvances(
      [
        { gamePlayerId: "H", netResultMoney: 500, advanceMoney: 0 },
        { gamePlayerId: "B", netResultMoney: -500, advanceMoney: 300 },
      ],
      "H",
    );
    expect(adjusted).toEqual([
      { gamePlayerId: "H", netResultMoney: 200 },
      { gamePlayerId: "B", netResultMoney: -200 },
    ]);
    expect(adjusted.reduce((sum, r) => sum + r.netResultMoney, 0)).toBe(0);
  });

  it("winner who paid an advance gets it back on top of winnings", () => {
    const adjusted = applyAdvances(
      [
        { gamePlayerId: "H", netResultMoney: -500, advanceMoney: 0 },
        { gamePlayerId: "B", netResultMoney: 500, advanceMoney: 300 },
      ],
      "H",
    );
    expect(adjusted).toEqual([
      { gamePlayerId: "H", netResultMoney: -800 },
      { gamePlayerId: "B", netResultMoney: 800 },
    ]);
  });

  it("advances without a host seat throw", () => {
    expect(() =>
      applyAdvances(
        [
          { gamePlayerId: "A", netResultMoney: 100, advanceMoney: 50 },
          { gamePlayerId: "B", netResultMoney: -100 },
        ],
        null,
      ),
    ).toThrow();
  });

  it("generateSettlement nets advances end to end in host mode", () => {
    const lines = generateSettlement(
      "host",
      [
        { gamePlayerId: "H", netResultMoney: 500, advanceMoney: 0 },
        { gamePlayerId: "B", netResultMoney: -500, advanceMoney: 300 },
      ],
      "H",
    );
    expect(lines).toEqual([{ fromGamePlayerId: "B", toGamePlayerId: "H", amount: 200 }]);
  });

  it("a buy-in paid at the table is money with the host: player gets the difference back", () => {
    // Varun paid ₹1,000 for chips and ends holding ₹500 of them.
    // The host is holding his cash, so the host owes him ₹500 back.
    const lines = generateSettlement(
      "direct",
      [
        { gamePlayerId: "H", netResultMoney: 500, advanceMoney: 0 },
        { gamePlayerId: "V", netResultMoney: -500, advanceMoney: 1000 },
      ],
      "H",
    );
    expect(lines).toEqual([{ fromGamePlayerId: "H", toGamePlayerId: "V", amount: 500 }]);
  });

  it("everyone prepaid: the host simply pays out each player's remaining value", () => {
    // Both bought in ₹1,000 cash. A ends with ₹1,500 of chips, B with ₹500.
    const lines = generateSettlement(
      "host",
      [
        { gamePlayerId: "H", netResultMoney: 0, advanceMoney: 0 },
        { gamePlayerId: "A", netResultMoney: 500, advanceMoney: 1000 },
        { gamePlayerId: "B", netResultMoney: -500, advanceMoney: 1000 },
      ],
      "H",
    );
    expect(lines).toEqual([
      { fromGamePlayerId: "H", toGamePlayerId: "A", amount: 1500 },
      { fromGamePlayerId: "H", toGamePlayerId: "B", amount: 500 },
    ]);
  });

  // Regression: a whole table defaulting to "paid" made the app believe the
  // host held every rupee, turning a normal night into "host pays everyone".
  // Nothing collected must mean nothing prepaid.
  it("collecting no cash leaves settlement as plain loser-pays-winner", () => {
    const lines = generateSettlement(
      "direct",
      [
        { gamePlayerId: "H", netResultMoney: -745, advanceMoney: 0 },
        { gamePlayerId: "W", netResultMoney: 2450, advanceMoney: 0 },
        { gamePlayerId: "L", netResultMoney: -1705, advanceMoney: 0 },
      ],
      "H",
    );
    expect(lines).toEqual([
      { fromGamePlayerId: "L", toGamePlayerId: "W", amount: 1705 },
      { fromGamePlayerId: "H", toGamePlayerId: "W", amount: 745 },
    ]);
    // The host only ever moves their own net, never the whole table's money.
    const hostOutflow = lines.filter((l) => l.fromGamePlayerId === "H").reduce((s, l) => s + l.amount, 0);
    expect(hostOutflow).toBe(745);
  });

  it("host mode without a host seat throws", () => {
    expect(() =>
      generateSettlement(
        "host",
        [
          { gamePlayerId: "A", netResultMoney: 100 },
          { gamePlayerId: "B", netResultMoney: -100 },
        ],
        null,
      ),
    ).toThrow();
  });
});
