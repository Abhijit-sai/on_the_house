import { ArrowRight, Flame, Lock, Spade, VenetianMask, Volleyball } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { listGamesForCurrentHost } from "@/features/poker/queries";
import { listRalliesForCurrentHost } from "@/features/rally/queries";
import { cn } from "@/lib/utils";

export default async function ArcadePage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const [games, rallies] = await Promise.all([listGamesForCurrentHost(), listRalliesForCurrentHost()]);

  const liveGames = games.filter((g) => ["live", "paused", "tally_pending"].includes(g.status)).length;
  const pendingGames = games.filter((g) => g.status === "pending_settlement").length;
  const activeRallies = rallies.filter((r) => r.status === "active").length;

  const pokerStatus =
    liveGames > 0
      ? `🔴 ${liveGames} table${liveGames === 1 ? "" : "s"} live`
      : pendingGames > 0
        ? `💸 ${pendingGames} settlement${pendingGames === 1 ? "" : "s"} pending`
        : games.length > 0
          ? `${games.filter((g) => g.status === "closed").length} nights hosted`
          : "Deal your first hand";

  const rallyStatus =
    activeRallies > 0
      ? `🔥 ${activeRallies} rall${activeRallies === 1 ? "y" : "ies"} in motion`
      : rallies.length > 0
        ? `${rallies.filter((r) => r.status === "completed").length} completed`
        : "Light the first fire";

  return (
    <div className="space-y-8">
      <div className="space-y-1 text-center lg:text-left">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gold-brand">The Arcade</p>
        <h1 className="text-4xl font-black text-white">Pick your game, {host.display_name.split(" ")[0]}.</h1>
        <p className="text-sm text-muted">Same crew. Different chaos.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ArcadeCard
          href="/app/dashboard"
          icon={<Spade className="h-12 w-12 text-gold-brand" />}
          title="Poker Night"
          tagline="Chips. Buy-ins. Zero arguments."
          description="Run the table live, tally the chips, and settle who pays whom before anyone leaves."
          status={pokerStatus}
          className="border-gold-brand/30 shadow-glow hover:border-gold-brand/60"
          glowClass="from-gold-brand/25"
        />
        <ArcadeCard
          href="/app/rallies"
          icon={<Flame className="h-12 w-12 text-red-danger" />}
          title="Rally"
          tagline="Daily proof. Peer votes. Streaks."
          description="Challenge the crew — check in every day, judge each other's proof, keep the fire alive."
          status={rallyStatus}
          className="border-red-brand/30 shadow-red-glow hover:border-red-brand/60"
          glowClass="from-red-brand/25"
        />
        <ComingSoonCard
          icon={<VenetianMask className="h-10 w-10" />}
          title="Undercover"
          description="One of you has a different word. Bluff, describe, accuse. Coming soon."
        />
        <ComingSoonCard
          icon={<Volleyball className="h-10 w-10" />}
          title="Tambola"
          description="Tickets on every phone, host draws the numbers, claims auto-verified. In the pipeline."
        />
      </div>

      <p className="text-center text-xs text-muted">
        Players, history, and settings are shared across every game — one crew, all the chaos.
      </p>
    </div>
  );
}

function ArcadeCard({
  href,
  icon,
  title,
  tagline,
  description,
  status,
  className,
  glowClass,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  tagline: string;
  description: string;
  status: string;
  className?: string;
  glowClass?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative overflow-hidden rounded-[28px] border bg-elevated p-6 transition duration-200 hover:-translate-y-0.5 active:scale-[0.99]",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial blur-2xl transition-opacity",
          "bg-gradient-to-br to-transparent opacity-60 group-hover:opacity-100",
          glowClass,
        )}
      />
      <div className="relative space-y-3">
        {icon}
        <div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="text-sm font-bold text-cream/80">{tagline}</p>
        </div>
        <p className="text-sm leading-6 text-muted">{description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-bold text-cream">
            {status}
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-gold-brand transition-transform group-hover:translate-x-0.5">
            Enter
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function ComingSoonCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-border p-6 text-muted">
      <div className="space-y-3 opacity-70">
        {icon}
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black">{title}</h2>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <Lock className="h-3 w-3" />
            Soon
          </span>
        </div>
        <p className="text-sm leading-6">{description}</p>
      </div>
    </div>
  );
}
