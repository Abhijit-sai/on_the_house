import { Drama } from "lucide-react";
import Link from "next/link";
import type { MafiaRoomSummary } from "@/features/mafia/queries";
import { cn } from "@/lib/utils";

export function MafiaRoomCard({ room }: { room: MafiaRoomSummary }) {
  const archived = room.status === "archived";

  return (
    <Link
      href={`/app/mafia/${room.id}`}
      className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-4 transition active:scale-[0.99]"
    >
      <Drama className="h-5 w-5 shrink-0 text-red-danger" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{room.title}</p>
        <p className="text-xs text-muted">
          {room.playerCount} in the crew · {room.gamesPlayed} game{room.gamesPlayed === 1 ? "" : "s"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
          archived ? "border-border text-muted" : "border-red-brand/50 bg-red-brand/10 text-red-200",
        )}
      >
        {archived ? "Archived" : "Open"}
      </span>
    </Link>
  );
}
