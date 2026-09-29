import { notFound } from "next/navigation";
import { ImposterRoom } from "@/features/imposter/components/imposter-room";
import { getImposterRoomForHost } from "@/features/imposter/queries";
import { listPlayersByPlayCount } from "@/features/players/queries";

export default async function ImposterRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const [view, players] = await Promise.all([getImposterRoomForHost(roomId), listPlayersByPlayCount()]);

  if (!view) {
    notFound();
  }

  return (
    <ImposterRoom
      view={view}
      players={players.map((p) => ({ id: p.id, name: p.name, color_key: p.color_key }))}
    />
  );
}
