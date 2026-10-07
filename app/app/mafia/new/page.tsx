import { redirect } from "next/navigation";
import { getCurrentHost } from "@/features/hosts/queries";
import { NewMafiaRoomForm } from "@/features/mafia/components/new-room-form";
import { listPlayersByPlayCount } from "@/features/players/queries";

export default async function NewMafiaRoomPage() {
  const host = await getCurrentHost();

  if (!host) {
    redirect("/app/onboarding");
  }

  const players = await listPlayersByPlayCount();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-danger">Mafia</p>
        <h1 className="text-3xl font-black text-white">Who&apos;s in town tonight?</h1>
        <p className="text-sm text-muted">
          Pick the crew — God included. The room keeps score across every game you play.
        </p>
      </div>
      <NewMafiaRoomForm players={players} hostName={host.display_name} />
    </div>
  );
}
