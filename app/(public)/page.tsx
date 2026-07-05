import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-8 pt-5 text-cream">
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
            Poker Night ledger now
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-[0.95] text-white">
              Host the night. Settle the chaos.
            </h1>
            <p className="text-base leading-7 text-muted">
              Run offline house-party games, track chips and scores, and settle up without confusion.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border bg-elevated p-4 shadow-glow">
          <div className="rounded-[22px] border border-border bg-background p-4">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full bg-red-brand/20 px-3 py-1 text-xs font-semibold text-red-danger">
                Live
              </span>
              <span className="text-sm text-muted">6 players</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Tracked" value="₹8,000" />
              <Metric label="Coins" value="16,000" />
              <Metric label="Unpaid" value="₹2,000" />
              <Metric label="Settled" value="0%" />
            </div>
          </div>
        </div>
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
