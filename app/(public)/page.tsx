import { ArrowRight, Flame, Sparkles, Spade } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-5 text-cream lg:max-w-4xl">
      <nav className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-gold-brand">On the House</p>
          <p className="text-sm text-muted">House party games</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </nav>

      <section className="flex flex-1 flex-col justify-center gap-8 py-10">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-elevated px-3 py-2 text-sm text-gold-brand">
            <Sparkles className="h-4 w-4" />
            Two games live — more on the way
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[0.95] text-white">Host the night. Settle the chaos.</h1>
            <p className="text-base leading-7 text-muted">
              Get your people off their screens and into the room. On the House runs the boring parts — scores, chips,
              settlements, streaks — so the night stays about the crew.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-border bg-elevated p-5 shadow-glow">
            <div className="flex items-center gap-2">
              <Spade className="h-6 w-6 text-gold-brand" />
              <h2 className="text-xl font-black text-white">Poker Night</h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-gold-brand">Chips, buy-ins, and a clean settle-up</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Track buy-ins live, tally the chips, and let the app work out exactly who pays whom — UPI links included.
            </p>
            <div className="mt-4 rounded-[22px] border border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-red-brand/20 px-3 py-1 text-xs font-semibold text-red-danger">Live</span>
                <span className="text-sm text-muted">6 players</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Tracked" value="₹8,000" />
                <Metric label="Coins" value="16,000" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-border bg-elevated p-5 shadow-red-glow">
            <div className="flex items-center gap-2">
              <Flame className="h-6 w-6 text-red-danger" />
              <h2 className="text-xl font-black text-white">Rally</h2>
            </div>
            <p className="mt-1 text-sm font-semibold text-red-danger">Group challenges your crew can't quit</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              30 days of workouts, daily reading, no-sugar month — everyone checks in with proof, the crew votes,
              streaks keep the pressure on.
            </p>
            <div className="mt-4 rounded-[22px] border border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success">Day 12 of 30</span>
                <span className="text-sm text-muted">5 rallying</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Checked in" value="4/5" />
                <Metric label="Top streak" value="🔥 12" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted">
          Your friends never need an account — they join with a link.
        </p>
      </section>

      <div className="sticky bottom-0 safe-bottom bg-gradient-to-t from-background via-background to-transparent pt-5">
        <Button asChild className="h-14 w-full text-base">
          <Link href="/sign-in">
            Start a Game Night
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}
