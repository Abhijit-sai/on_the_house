import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Link2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArcadeCarousel, type ArcadeGame } from "@/features/arcade/arcade-carousel";

// Landing-page deck: every playable card sends you to sign-in.
const games: ArcadeGame[] = [
  {
    id: "poker",
    title: "Poker Night",
    tagline: "Chips, buy-ins & a clean settle-up.",
    href: "/sign-in",
    image: "/games/poker.png",
    icon: "spade",
    accent: "gold",
    status: "Live",
  },
  {
    id: "rally",
    title: "Rally",
    tagline: "Daily proof. Peer votes. Streaks.",
    href: "/sign-in",
    image: "/games/rally.png",
    icon: "flame",
    accent: "red",
    status: "Live",
  },
  {
    id: "undercover",
    title: "Undercover",
    tagline: "One of you has a different word.",
    href: null,
    image: "/games/undercover.png",
    icon: "mask",
    accent: "red",
    status: null,
  },
  {
    id: "tambola",
    title: "Tambola",
    tagline: "Tickets out, numbers up, pot's alive.",
    href: null,
    image: "/games/tambola.png",
    icon: "ball",
    accent: "gold",
    status: null,
  },
  {
    id: "mafia",
    title: "Mafia",
    tagline: "The town sleeps. The mafia doesn't.",
    href: null,
    image: "/games/mafia.png",
    icon: "drama",
    accent: "red",
    status: null,
  },
];

const promises = [
  {
    icon: Users,
    title: "One crew, every game",
    copy: "Save your regulars once. Every game night pulls from the same address book.",
  },
  {
    icon: Link2,
    title: "Share a link, not an app",
    copy: "Send the room a link — they follow the table live or check in on their own phone.",
  },
  {
    icon: Trophy,
    title: "The night keeps score",
    copy: "Settlements, streaks and history stack up, so every game night has a record.",
  },
];

export default async function LandingPage() {
  // A signed-in visitor wants the app, not the marketing page. Production Clerk
  // sends people to "/" after sign-in by default, so this is what lands them
  // in the app.
  const { userId } = await auth();

  if (userId) {
    redirect("/app/dashboard");
  }

  return (
    <main className="relative min-h-dvh overflow-hidden text-cream">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="ambient-drift absolute -left-32 -top-20 h-96 w-96 rounded-full bg-red-brand/15 blur-3xl" />
        <div
          className="ambient-drift absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-gold-brand/15 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 lg:px-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-gold-brand">On the House</p>
          <p className="text-sm text-muted">House party games</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </nav>

      <section className="mx-auto w-full max-w-6xl px-4 pt-6 text-center lg:px-10 lg:pt-12">
        <h1 className="text-5xl font-black leading-[0.95] text-white lg:text-7xl">
          Host the night.
          <br />
          Settle the chaos.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted">
          Get your people off their screens and into the room. On the House runs the boring parts — chips,
          settlements, streaks — so the night stays about the crew.
        </p>
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 lg:px-10">
        <ArcadeCarousel games={games} />
      </div>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-8 lg:grid-cols-3 lg:px-10">
        {promises.map((promise) => {
          const Icon = promise.icon;

          return (
            <div key={promise.title} className="rounded-[24px] border border-border bg-elevated/60 p-5">
              <Icon className="h-6 w-6 text-gold-brand" />
              <h2 className="mt-3 font-black text-white">{promise.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{promise.copy}</p>
            </div>
          );
        })}
      </section>

      <div className="mx-auto w-full max-w-6xl px-4 pb-10 lg:px-10">
        <Button asChild className="h-14 w-full text-base shadow-glow lg:mx-auto lg:max-w-sm">
          <Link href="/sign-in">
            Start a Game Night
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted">Free to host · your crew joins with a link</p>
        <p className="mt-6 flex justify-center gap-4 text-xs text-muted">
          <Link href="/privacy" className="hover:text-cream">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-cream">
            Terms
          </Link>
        </p>
      </div>
    </main>
  );
}
