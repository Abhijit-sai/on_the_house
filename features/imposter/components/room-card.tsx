import { VenetianMask } from "lucide-react";
import Link from "next/link";
import type { ImposterRoomSummary } from "@/features/imposter/queries";
import { cn } from "@/lib/utils";

export function ImposterRoomCard({ room }: { room: ImposterRoomSummary }) {
  const archived = room.status === "archived";

  return (
    <Link
      href={`/app/imposter/${room.id}`}
      className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-4 transition active:scale-[0.99]"
    >
      <VenetianMask className="h-5 w-5 shrink-0 text-violet-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{room.title}</p>
        <p className="text-xs text-muted">
          {room.playerCount} players · {room.gamesPlayed} game{room.gamesPlayed === 1 ? "" : "s"}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
          archived ? "border-border text-muted" : "border-violet-400/50 bg-violet-500/10 text-violet-200",
        )}
      >
        {archived ? "Archived" : "Open"}
      </span>
    </Link>
  );
}
