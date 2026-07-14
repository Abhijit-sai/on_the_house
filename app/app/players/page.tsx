import { redirect } from "next/navigation";
import { PlayerForm } from "@/features/players/components/player-form";
import { PlayerList } from "@/features/players/components/player-list";
import { getCurrentHost } from "@/features/hosts/queries";
import { getPlayerParticipation, listPlayersForCurrentHost } from "@/features/players/queries";

export default async function PlayersPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const [players, participation] = await Promise.all([listPlayersForCurrentHost(), getPlayerParticipation()]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gold-brand">Address book</p>
        <h1 className="text-3xl font-black text-white">Players</h1>
        <p className="leading-6 text-muted">One crew for every game — save names once, reuse them everywhere.</p>
      </div>
      <PlayerForm />
      <PlayerList
        players={players}
        pokerPlayerIds={participation.pokerPlayerIds}
        rallyPlayerIds={participation.rallyPlayerIds}
      />
    </div>
  );
}
