import Link from "next/link";
import { redirect } from "next/navigation";
import { Flame, Spade } from "lucide-react";
import { getCurrentHost } from "@/features/hosts/queries";

const modules = [
  {
    href: "/app/games/new/poker",
    icon: Spade,
    accent: "text-gold-brand",
    glow: "shadow-glow",
    title: "Poker Night",
    tagline: "Chips, buy-ins, and a clean settle-up",
    description: "Track buy-ins and chip counts live, tally the night, and let the app figure out who pays whom.",
  },
  {
    href: "/app/rallies/new",
    icon: Flame,
    accent: "text-red-danger",
    glow: "shadow-red-glow",
    title: "Rally",
    tagline: "Group challenge, daily proof, peer votes",
    description: "Set a challenge with your crew — everyone checks in daily, the group votes, streaks keep score.",
  },
];

export default async function NewGameNightPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gold-brand">On the House</p>
        <h1 className="text-3xl font-black text-white">Pick tonight's game</h1>
        <p className="text-sm text-muted">Every module runs on your same player crew.</p>
      </div>

      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
        {modules.map((mod) => {
          const Icon = mod.icon;

          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={`block rounded-[20px] border border-border bg-elevated p-5 transition hover:border-gold-brand/40 active:scale-[0.99] ${mod.glow}`}
            >
              <Icon className={`h-8 w-8 ${mod.accent}`} />
              <h2 className="mt-3 text-xl font-black text-white">{mod.title}</h2>
              <p className={`text-sm font-semibold ${mod.accent}`}>{mod.tagline}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{mod.description}</p>
            </Link>
          );
        })}

        <div className="rounded-[20px] border border-dashed border-border p-5 text-muted">
          <h2 className="text-lg font-bold">More on the way</h2>
          <p className="mt-1 text-sm leading-6">
            Imposter night, score tracker, pot splitter, tournament brackets — the house always has another game.
          </p>
        </div>
      </div>
    </div>
  );
}
