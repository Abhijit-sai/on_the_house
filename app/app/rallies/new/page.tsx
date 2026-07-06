import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { listPlayersForCurrentHost } from "@/features/players/queries";
import { NewRallyForm } from "@/features/rally/components/new-rally-form";

export default async function NewRallyPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const players = await listPlayersForCurrentHost();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-danger">Rally</p>
        <h1 className="text-3xl font-black text-white">Rally the crew</h1>
        <p className="text-sm text-muted">Daily check-ins, peer votes, streaks on the line.</p>
      </div>
      <NewRallyForm players={players} hostName={host.display_name} />
    </div>
  );
}
