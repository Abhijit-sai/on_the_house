import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { listPlayersForCurrentHost } from "@/features/players/queries";
import { NewGameWizard } from "@/features/poker/components/new-game-wizard";

export default async function NewPokerGamePage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const players = await listPlayersForCurrentHost();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gold-brand">Poker Night</p>
        <h1 className="text-3xl font-black text-white">Set the table</h1>
      </div>
      <NewGameWizard players={players} />
    </div>
  );
}
