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
