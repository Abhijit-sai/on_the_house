import { redirect } from "next/navigation";
import { ArcadeCarousel, type ArcadeGame } from "@/features/arcade/arcade-carousel";
import { getCurrentHost } from "@/features/hosts/queries";
import { listImposterRoomsForCurrentHost } from "@/features/imposter/queries";
import { listMafiaRoomsForCurrentHost } from "@/features/mafia/queries";
import { listGamesForCurrentHost } from "@/features/poker/queries";
import { listRalliesForCurrentHost } from "@/features/rally/queries";

export default async function ArcadePage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const [games, rallies, imposterRooms, mafiaRooms] = await Promise.all([
    listGamesForCurrentHost(),
    listRalliesForCurrentHost(),
    listImposterRoomsForCurrentHost(),
    listMafiaRoomsForCurrentHost(),
  ]);

  const liveGames = games.filter((g) => ["live", "paused", "tally_pending"].includes(g.status)).length;
  const pendingGames = games.filter((g) => g.status === "pending_settlement").length;
  const closedGames = games.filter((g) => g.status === "closed").length;
  const activeRallies = rallies.filter((r) => r.status === "active").length;

  const pokerStatus =
    liveGames > 0
      ? `🔴 ${liveGames} table${liveGames === 1 ? "" : "s"} live`
      : pendingGames > 0
        ? `💸 ${pendingGames} to settle`
        : closedGames > 0
          ? `${closedGames} night${closedGames === 1 ? "" : "s"} hosted`
          : "Deal the first hand";

  const rallyStatus =
    activeRallies > 0
      ? `🔥 ${activeRallies} in motion`
      : rallies.some((r) => r.status === "completed")
        ? `${rallies.filter((r) => r.status === "completed").length} completed`
        : "Light the first fire";

  const imposterGames = imposterRooms.reduce((sum, r) => sum + r.gamesPlayed, 0);
  const imposterStatus =
    imposterGames > 0
      ? `🎭 ${imposterGames} game${imposterGames === 1 ? "" : "s"} played`
      : imposterRooms.length > 0
        ? "Room's open"
        : "Pass the phone";

  const mafiaGames = mafiaRooms.reduce((sum, r) => sum + r.gamesPlayed, 0);
  const mafiaStatus =
    mafiaGames > 0
      ? `🔪 ${mafiaGames} game${mafiaGames === 1 ? "" : "s"} played`
      : mafiaRooms.length > 0
        ? "Room's open"
        : "Play God tonight";

  const arcadeGames: ArcadeGame[] = [
    // Newest game leads the carousel so it starts in the spotlight.
    {
      id: "mafia",
      title: "Mafia",
      tagline: "The town sleeps. The mafia doesn't.",
      href: "/app/mafia",
      image: "/games/mafia.png",
      icon: "drama",
      accent: "red",
      status: mafiaStatus,
      badge: "New",
    },
    {
      id: "imposter",
      title: "Imposter",
      tagline: "One of you has a different word.",
      href: "/app/imposter",
      image: "/games/undercover.png",
      icon: "mask",
      accent: "violet",
      status: imposterStatus,
    },
    {
      id: "poker",
      title: "Poker Night",
      tagline: "Chips, buy-ins & a clean settle-up.",
      href: "/app/dashboard",
      image: "/games/poker.png",
      icon: "spade",
      accent: "gold",
      status: pokerStatus,
    },
    {
      id: "rally",
      title: "Rally",
      tagline: "Daily proof. Peer votes. Streaks.",
      href: "/app/rallies",
      image: "/games/rally.png",
      icon: "flame",
      accent: "red",
      status: rallyStatus,
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
  ];

  return (
    <div className="relative min-h-[80dvh]">
      {/* ambient gaming glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="ambient-drift absolute -left-32 top-0 h-96 w-96 rounded-full bg-red-brand/10 blur-3xl" />
        <div
          className="ambient-drift absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-gold-brand/10 blur-3xl"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="space-y-2 pt-4 text-center lg:pt-10">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-gold-brand">The Arcade</p>
        <h1 className="text-4xl font-black text-white lg:text-5xl">
          Pick your game, {host.display_name.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted">Same crew. Different chaos.</p>
      </div>

      <div className="mt-6">
        <ArcadeCarousel games={arcadeGames} />
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Swipe for more games · Players, history & settings are shared across every game
      </p>
    </div>
  );
}
