import { Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { PokerLeaderboard } from "@/features/poker/components/poker-leaderboard";
import { getPokerLeaderboard } from "@/features/poker/queries";

export default async function PokerLeaderboardPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const { rows, summary } = await getPokerLeaderboard();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-gold-brand">
          <Trophy className="h-4 w-4" />
          Poker Night
        </p>
        <h1 className="text-3xl font-black text-white">All-time standings</h1>
        <p className="text-sm text-muted">Every settled night, added up. Cancelled and unsettled games don&apos;t count.</p>
      </div>
      <PokerLeaderboard rows={rows} summary={summary} />
    </div>
  );
}
