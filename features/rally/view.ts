// Assembles raw rally rows into the shape both the host room and the public
// room render: standings, day windows, and a votable check-in feed.

import type { Rally, RallyCheckIn, RallyCheckInStatus, RallyMember, RallyVote } from "@/db/types/database";
import {
  calculateStreaks,
  commitmentPercent,
  dayCells,
  elapsedDays,
  memberHistory,
  rankStandings,
  todayISO,
  totalRallyDays,
  type ApprovalState,
  type DayCell,
  type MemberStanding,
} from "@/features/rally/engine";

export type RallyMemberView = {
  id: string;
  playerId: string;
  name: string;
  avatarKey: string | null;
  colorKey: string | null;
  isHostMember: boolean;
  joinedOn: string;
  checkedInToday: boolean;
};

export type CheckInView = {
  id: string;
  memberId: string;
  memberName: string;
  colorKey: string | null;
  date: string;
  message: string | null;
  proofImageUrl: string | null;
  status: RallyCheckInStatus;
  decidedByHost: boolean;
  yesVotes: number;
  noVotes: number;
  eligibleVoters: number;
  /** voter member id → their vote, so the viewer can see their own choice */
  votesByVoter: Record<string, boolean>;
};

export type StandingView = MemberStanding & {
  colorKey: string | null;
  isHostMember: boolean;
  checkedInToday: boolean;
  /** Whole rally window from the member's join date: one cell per day. */
  dayCells: DayCell[];
};

export type RallyView = {
  rally: Pick<Rally, "id" | "title" | "description" | "start_date" | "end_date" | "status" | "public_token">;
  today: string;
  dayNumber: number; // 1-based; 0 if not started yet
  totalDays: number;
  hasStarted: boolean;
  hasEnded: boolean;
  members: RallyMemberView[];
  standings: StandingView[];
  todayFeed: CheckInView[];
  recentFeed: CheckInView[];
};

type MemberWithPlayer = RallyMember & { name: string; avatar_key: string | null; color_key: string | null };

export function buildRallyView(
  rally: Rally,
  members: MemberWithPlayer[],
  checkIns: RallyCheckIn[],
  votes: RallyVote[],
  today = todayISO(),
): RallyView {
  const rallyDays = elapsedDays(rally.start_date, rally.end_date, today);
  const hasStarted = today >= rally.start_date;
  const hasEnded = today > rally.end_date;
  const dayNumber = hasStarted ? Math.min(rallyDays.length, totalRallyDays(rally.start_date, rally.end_date)) : 0;

  const votesByCheckIn = new Map<string, RallyVote[]>();

  for (const vote of votes) {
    const list = votesByCheckIn.get(vote.check_in_id) ?? [];
    list.push(vote);
    votesByCheckIn.set(vote.check_in_id, list);
  }

  const eligibleVoters = Math.max(members.length - 1, 0);

  const toCheckInView = (checkIn: RallyCheckIn): CheckInView => {
    const member = members.find((m) => m.id === checkIn.rally_member_id);
    const own = votesByCheckIn.get(checkIn.id) ?? [];

    return {
      id: checkIn.id,
      memberId: checkIn.rally_member_id,
      memberName: member?.name ?? "Member",
      colorKey: member?.color_key ?? null,
      date: checkIn.check_in_date,
      message: checkIn.message,
      proofImageUrl: checkIn.proof_image_url,
      status: checkIn.status,
      decidedByHost: checkIn.decided_by_host,
      yesVotes: own.filter((v) => v.vote).length,
      noVotes: own.filter((v) => !v.vote).length,
      eligibleVoters,
      votesByVoter: Object.fromEntries(own.map((v) => [v.voter_member_id, v.vote])),
    };
  };

  const todayCheckIns = checkIns.filter((c) => c.check_in_date === today);
  const memberViews: RallyMemberView[] = members.map((member) => ({
    id: member.id,
    playerId: member.player_id,
    name: member.name,
    avatarKey: member.avatar_key,
    colorKey: member.color_key,
    isHostMember: member.is_host_member,
    joinedOn: member.joined_on,
    checkedInToday: todayCheckIns.some((c) => c.rally_member_id === member.id),
  }));

  const standings: StandingView[] = rankStandings(
    members.map((member) => {
      const own = checkIns.filter((c) => c.rally_member_id === member.id && c.status !== "rejected");
      const history = memberHistory(
        rallyDays,
        member.joined_on,
        own.map((c) => c.check_in_date),
      );
      const { currentStreak, bestStreak } = calculateStreaks(history);
      const allOwn = checkIns.filter((c) => c.rally_member_id === member.id);

      return {
        memberId: member.id,
        name: member.name,
        commitmentPercent: commitmentPercent(history),
        currentStreak,
        bestStreak,
        totalCheckIns: allOwn.length,
        approvedCheckIns: allOwn.filter((c) => c.status === "approved").length,
      };
    }),
  ).map((standing) => {
    const member = memberViews.find((m) => m.id === standing.memberId);
    const statusByDate = new Map<string, ApprovalState>(
      checkIns.filter((c) => c.rally_member_id === standing.memberId).map((c) => [c.check_in_date, c.status]),
    );

    return {
      ...standing,
      colorKey: member?.colorKey ?? null,
      isHostMember: member?.isHostMember ?? false,
      checkedInToday: member?.checkedInToday ?? false,
      dayCells: dayCells(rally.start_date, rally.end_date, member?.joinedOn ?? rally.start_date, today, statusByDate),
    };
  });

  const recent = [...checkIns]
    .filter((c) => c.check_in_date !== today)
    .sort((a, b) => (a.check_in_date < b.check_in_date ? 1 : -1))
    .slice(0, 10);

  return {
    rally: {
      id: rally.id,
      title: rally.title,
      description: rally.description,
      start_date: rally.start_date,
      end_date: rally.end_date,
      status: rally.status,
      public_token: rally.public_token,
    },
    today,
    dayNumber,
    totalDays: totalRallyDays(rally.start_date, rally.end_date),
    hasStarted,
    hasEnded,
    members: memberViews,
    standings,
    todayFeed: todayCheckIns.map(toCheckInView),
    recentFeed: recent.map(toCheckInView),
  };
}
