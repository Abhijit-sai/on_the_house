import { Flame, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentHost } from "@/features/hosts/queries";
import { RallyCard } from "@/features/rally/components/rally-card";
import { listRalliesForCurrentHost } from "@/features/rally/queries";

export default async function RalliesHubPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const rallies = await listRalliesForCurrentHost();
  const active = rallies.filter((r) => r.status === "active");
  const finished = rallies.filter((r) => r.status === "completed" || r.status === "cancelled");

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-red-danger">Rally</p>
          <h1 className="text-3xl font-black text-white">Keep the fire alive</h1>
        </div>
        <Card className="shadow-red-glow">
          <CardHeader>
            <CardTitle className="text-2xl">Rally your crew</CardTitle>
            <CardDescription>
              Pick a challenge, set the days, and hold each other to it — daily proof, peer votes, streaks on the line.
            </CardDescription>
          </CardHeader>
          <Button asChild className="w-full" size="lg">
            <Link href="/app/rallies/new">
              <Flame className="h-5 w-5" />
              Start a rally
            </Link>
          </Button>
        </Card>
      </section>

      {active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">In motion</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {active.map((rally) => (
              <RallyCard key={rally.id} rally={rally} />
            ))}
          </div>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-white">Finished</h2>
          <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {finished.map((rally) => (
              <RallyCard key={rally.id} rally={rally} />
            ))}
          </div>
        </section>
      ) : null}

      {rallies.length === 0 ? (
        <EmptyState
          title="No rallies yet"
          description="Start your first challenge — 30 days of workouts, daily reading, no-sugar month. Your crew joins with a link."
        />
      ) : null}

      <div className="sticky bottom-24 lg:hidden">
        <Button asChild className="h-14 w-full text-base shadow-red-glow">
          <Link href="/app/rallies/new">
            <Plus className="h-5 w-5" />
            Start a rally
          </Link>
        </Button>
      </div>
    </div>
  );
}
