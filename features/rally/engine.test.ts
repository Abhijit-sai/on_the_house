import { describe, expect, it } from "vitest";
import {
  addDays,
  approvalState,
  calculateStreaks,
  commitmentPercent,
  dayCells,
  elapsedDays,
  memberHistory,
  rankStandings,
  totalRallyDays,
} from "./engine";

describe("day windows", () => {
  it("addDays crosses month boundaries", () => {
    expect(addDays("2026-06-30", 1)).toBe("2026-07-01");
  });

  it("elapsedDays caps at today", () => {
    expect(elapsedDays("2026-07-01", "2026-07-30", "2026-07-03")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
  });

  it("elapsedDays caps at end date after the rally finishes", () => {
    expect(elapsedDays("2026-07-01", "2026-07-02", "2026-07-10")).toEqual(["2026-07-01", "2026-07-02"]);
  });

  it("elapsedDays is empty before the start", () => {
    expect(elapsedDays("2026-07-05", "2026-07-30", "2026-07-04")).toEqual([]);
  });

  it("totalRallyDays is inclusive", () => {
    expect(totalRallyDays("2026-07-01", "2026-07-30")).toBe(30);
  });
});

describe("member history", () => {
  it("starts from the join date, not the rally start", () => {
    const days = elapsedDays("2026-07-01", "2026-07-30", "2026-07-04");
    const history = memberHistory(days, "2026-07-03", ["2026-07-03"]);
    expect(history).toEqual([
      { date: "2026-07-03", submitted: true },
      { date: "2026-07-04", submitted: false },
    ]);
  });
});

describe("streaks", () => {
  const entry = (date: string, submitted: boolean) => ({ date, submitted });

  it("best streak finds the longest run", () => {
    const { bestStreak } = calculateStreaks([
      entry("2026-07-01", true),
      entry("2026-07-02", true),
      entry("2026-07-03", false),
      entry("2026-07-04", true),
    ]);
    expect(bestStreak).toBe(2);
  });

  it("current streak counts back from the latest day", () => {
    const { currentStreak } = calculateStreaks([
      entry("2026-07-01", false),
      entry("2026-07-02", true),
      entry("2026-07-03", true),
    ]);
    expect(currentStreak).toBe(2);
  });

  it("today not yet submitted does not break the current streak", () => {
    const { currentStreak } = calculateStreaks([
      entry("2026-07-01", true),
      entry("2026-07-02", true),
      entry("2026-07-03", false),
    ]);
    expect(currentStreak).toBe(2);
  });

  it("a gap before yesterday breaks the streak", () => {
    const { currentStreak } = calculateStreaks([
      entry("2026-07-01", true),
      entry("2026-07-02", false),
      entry("2026-07-03", true),
      entry("2026-07-04", false),
    ]);
    expect(currentStreak).toBe(1);
  });

  it("empty history has zero streaks", () => {
    expect(calculateStreaks([])).toEqual({ currentStreak: 0, bestStreak: 0 });
  });
});

describe("commitment", () => {
  it("percentage of submitted days", () => {
    expect(
      commitmentPercent([
        { date: "2026-07-01", submitted: true },
        { date: "2026-07-02", submitted: false },
      ]),
    ).toBe(50);
  });

  it("zero days is zero percent", () => {
    expect(commitmentPercent([])).toBe(0);
  });
});

describe("approval", () => {
  it("majority of other members approves", () => {
    // 4 other members → majority is 3
    expect(approvalState(3, 0, 4)).toBe("approved");
    expect(approvalState(2, 1, 4)).toBe("pending");
  });

  it("majority rejects", () => {
    expect(approvalState(0, 3, 4)).toBe("rejected");
  });

  it("single other voter decides alone", () => {
    expect(approvalState(1, 0, 1)).toBe("approved");
    expect(approvalState(0, 1, 1)).toBe("rejected");
  });

  it("solo rally auto-approves", () => {
    expect(approvalState(0, 0, 0)).toBe("approved");
  });
});

describe("day cells", () => {
  it("maps the full window: statuses, missed, open today, future", () => {
    const cells = dayCells(
      "2026-07-01",
      "2026-07-05",
      "2026-07-01",
      "2026-07-03",
      new Map([
        ["2026-07-01", "approved"],
        ["2026-07-02", "pending"],
      ]),
    );
    expect(cells).toEqual([
      { date: "2026-07-01", state: "approved" },
      { date: "2026-07-02", state: "pending" },
      { date: "2026-07-03", state: "open" },
      { date: "2026-07-04", state: "future" },
      { date: "2026-07-05", state: "future" },
    ]);
  });

  it("marks unsubmitted past days as missed and starts at the join date", () => {
    const cells = dayCells("2026-07-01", "2026-07-04", "2026-07-02", "2026-07-04", new Map());
    expect(cells).toEqual([
      { date: "2026-07-02", state: "missed" },
      { date: "2026-07-03", state: "missed" },
      { date: "2026-07-04", state: "open" },
    ]);
  });
});

describe("standings", () => {
  it("ranks by commitment, then streak", () => {
    const ranked = rankStandings([
      { memberId: "a", name: "A", commitmentPercent: 50, currentStreak: 5, bestStreak: 5, totalCheckIns: 5, approvedCheckIns: 5 },
      { memberId: "b", name: "B", commitmentPercent: 90, currentStreak: 1, bestStreak: 3, totalCheckIns: 9, approvedCheckIns: 8 },
      { memberId: "c", name: "C", commitmentPercent: 90, currentStreak: 4, bestStreak: 4, totalCheckIns: 9, approvedCheckIns: 9 },
    ]);
    expect(ranked.map((s) => s.memberId)).toEqual(["c", "b", "a"]);
  });
});
