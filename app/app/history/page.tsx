import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentHost } from "@/features/hosts/queries";
import { GameCard } from "@/features/poker/components/game-card";
import { listGamesForCurrentHost } from "@/features/poker/queries";

export default async function HistoryPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const games = await listGamesForCurrentHost();
  const finished = games.filter((g) => g.status === "closed" || g.status === "cancelled");
  const inFlight = games.filter((g) => g.status !== "closed" && g.status !== "cancelled");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-white">History</h1>

      {inFlight.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">In progress</h2>
          <div className="space-y-2">
            {inFlight.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-bold text-white">Finished nights</h2>
        {finished.length === 0 ? (
          <EmptyState title="No finished games yet" description="Closed and cancelled games will appear here." />
        ) : (
          <div className="space-y-2">
            {finished.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
