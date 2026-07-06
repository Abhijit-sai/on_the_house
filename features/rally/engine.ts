// Pure, UI-independent Rally accounting: day windows, streaks, commitment,
// and peer-vote approval. Server actions re-derive check-in status with these
// functions; nothing here touches the database.

export type DayEntry = {
  date: string; // YYYY-MM-DD
  submitted: boolean;
};

/** Calendar date in the rally's timezone (default: India). */
export function todayISO(timeZone = "Asia/Kolkata", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

export function addDays(dateISO: string, days: number): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Inclusive list of rally days that have started, capped at today and the end date. */
export function elapsedDays(startDate: string, endDate: string, today: string): string[] {
  const cap = today < endDate ? today : endDate;
  const days: string[] = [];

  for (let day = startDate; day <= cap; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

export function totalRallyDays(startDate: string, endDate: string): number {
  let count = 0;

  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    count += 1;
  }

  return count;
}

/** Days this member was expected to check in: from the later of joining/start, up to today. */
export function memberHistory(rallyDays: string[], joinedOn: string, checkInDates: Iterable<string>): DayEntry[] {
  const submitted = new Set(checkInDates);

  return rallyDays.filter((day) => day >= joinedOn).map((date) => ({ date, submitted: submitted.has(date) }));
}

export function calculateStreaks(history: DayEntry[]): { currentStreak: number; bestStreak: number } {
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;

  const chronological = [...history].sort((a, b) => (a.date < b.date ? -1 : 1));

  for (const day of chronological) {
    if (day.submitted) {
      tempStreak += 1;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  for (let i = chronological.length - 1; i >= 0; i -= 1) {
    const day = chronological[i];

    // Today not being submitted YET should not break the streak — skip a
    // trailing unsubmitted day, but any earlier gap ends the run.
    if (!day.submitted) {
      if (i === chronological.length - 1) continue;
      break;
    }

    currentStreak += 1;
  }

  return { currentStreak, bestStreak };
}

export function commitmentPercent(history: DayEntry[]): number {
  if (history.length === 0) return 0;

  const submitted = history.filter((day) => day.submitted).length;
  return Math.round((submitted / history.length) * 10000) / 100;
}

export type ApprovalState = "pending" | "approved" | "rejected";

export type DayState = "approved" | "pending" | "rejected" | "missed" | "open" | "future";

export type DayCell = { date: string; state: DayState };

/** Every rally day (start → end inclusive), regardless of today. */
export function allRallyDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];

  for (let day = startDate; day <= endDate; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

/**
 * Per-day cells for one member's whole rally window, from their join date on:
 * check-in status where one exists, `open` for an unsubmitted today,
 * `missed` for unsubmitted past days, `future` for days not reached yet.
 */
export function dayCells(
  startDate: string,
  endDate: string,
  joinedOn: string,
  today: string,
  statusByDate: Map<string, ApprovalState>,
): DayCell[] {
  return allRallyDays(startDate, endDate)
    .filter((date) => date >= joinedOn)
    .map((date) => {
      const status = statusByDate.get(date);

      if (status) return { date, state: status };
      if (date > today) return { date, state: "future" };
      if (date === today) return { date, state: "open" };
      return { date, state: "missed" };
    });
}

/**
 * Peer approval: majority of the other members decides. With no other members
 * (solo rally), check-ins approve themselves.
 */
export function approvalState(yesVotes: number, noVotes: number, eligibleVoters: number): ApprovalState {
  if (eligibleVoters <= 0) return "approved";

  const majority = Math.floor(eligibleVoters / 2) + 1;

  if (yesVotes >= majority) return "approved";
  if (noVotes >= majority) return "rejected";
  return "pending";
}

export type MemberStanding = {
  memberId: string;
  name: string;
  commitmentPercent: number;
  currentStreak: number;
  bestStreak: number;
  totalCheckIns: number;
  approvedCheckIns: number;
};

export function rankStandings(standings: MemberStanding[]): MemberStanding[] {
  return [...standings].sort(
    (a, b) =>
      b.commitmentPercent - a.commitmentPercent ||
      b.currentStreak - a.currentStreak ||
      b.approvedCheckIns - a.approvedCheckIns ||
      a.name.localeCompare(b.name),
  );
}
