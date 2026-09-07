import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentHost } from "@/features/hosts/queries";
import { GameCard } from "@/features/poker/components/game-card";
import { PokerLeaderboard } from "@/features/poker/components/poker-leaderboard";
import { getHostStats, getPokerLeaderboard, listGamesForCurrentHost } from "@/features/poker/queries";
import { formatMoney, formatSignedMoney } from "@/lib/format";

export default async function DashboardPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const games = await listGamesForCurrentHost();
  const closedGameIds = games.filter((g) => g.status === "closed").map((g) => g.id);
  const [stats, leaderboard] = await Promise.all([getHostStats(closedGameIds), getPokerLeaderboard()]);

  const liveGames = games.filter((g) => g.status === "live" || g.status === "paused" || g.status === "tally_pending");
  const draftGames = games.filter((g) => g.status === "draft");
  const pendingGames = games.filter((g) => g.status === "pending_settlement");
  const recentGames = games.filter((g) => g.status === "closed" || g.status === "cancelled").slice(0, 5);

  const sections = [
    { title: "Live now", games: liveGames },
    { title: "Ready to start", games: draftGames },
    { title: "Waiting on payments", games: pendingGames },
    { title: "Recent nights", games: recentGames },
  ].filter((section) => section.games.length > 0);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm text-muted">Good to see you, {host.display_name}.</p>
        <Card className="bg-gold-tint shadow-glow">
          <CardHeader>
            <CardTitle className="text-2xl">Ready for the next round?</CardTitle>
            <CardDescription>Set the table, seat your players, and let the chips fly.</CardDescription>
          </CardHeader>
          <Button asChild className="w-full" size="lg">
            <Link href="/app/games/new/poker">
              <Plus className="h-5 w-5" />
              Start New Game Night
            </Link>
          </Button>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">Games hosted</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{closedGameIds.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Pending settlements</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{pendingGames.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Volume tracked</p>
          <p className="mt-1 text-2xl font-black tabular-nums">{formatMoney(stats.volumeTracked)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Running hot</p>
          {stats.biggestWinner ? (
            <>
              <p className="mt-1 truncate text-lg font-black">{stats.biggestWinner.name}</p>
              <p className="text-sm font-bold tabular-nums text-success">{formatSignedMoney(stats.biggestWinner.net)}</p>
            </>
          ) : (
            <p className="mt-1 text-lg font-black text-muted">—</p>
          )}
        </Card>
      </section>

      {leaderboard.rows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-white">
              <Trophy className="h-4 w-4 text-gold-brand" />
              All-time standings
            </h2>
            <Link href="/app/games/leaderboard" className="text-xs font-bold text-gold-brand">
              See all {leaderboard.rows.length} →
            </Link>
          </div>
          <PokerLeaderboard rows={leaderboard.rows} summary={leaderboard.summary} limit={3} />
        </section>
      ) : null}

      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="font-bold text-white">{section.title}</h2>
          <div className="space-y-2">
            {section.games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ))}

      {games.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No games yet. Hit Start New Game Night, seat your friends, and On the House keeps the whole tally — buy-ins,
            chips, and who pays whom at the end.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
