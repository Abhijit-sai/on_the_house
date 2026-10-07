import { notFound } from "next/navigation";
import { MafiaRoom } from "@/features/mafia/components/mafia-room";
import { getMafiaRoomForHost } from "@/features/mafia/queries";
import { listPlayersByPlayCount } from "@/features/players/queries";

export default async function MafiaRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const [view, players] = await Promise.all([getMafiaRoomForHost(roomId), listPlayersByPlayCount()]);

  if (!view) {
    notFound();
  }

  return <MafiaRoom view={view} players={players.map((p) => ({ id: p.id, name: p.name, color_key: p.color_key }))} />;
}
