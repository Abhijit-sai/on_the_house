import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { NewImposterRoomForm } from "@/features/imposter/components/new-room-form";
import { listPlayersByPlayCount } from "@/features/players/queries";

export default async function NewImposterRoomPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const players = await listPlayersByPlayCount();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-violet-300">Imposter</p>
        <h1 className="text-3xl font-black text-white">Who&apos;s at the table?</h1>
        <p className="text-sm text-muted">Pick tonight&apos;s crew. The room keeps score across every game you play.</p>
      </div>
      <NewImposterRoomForm players={players} hostName={host.display_name} />
    </div>
  );
}
