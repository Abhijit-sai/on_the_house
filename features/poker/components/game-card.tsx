import Link from "next/link";
import type { Game } from "@/db/types/database";
import { StatusBadge } from "@/features/poker/components/status-badge";

export function GameCard({ game }: { game: Game }) {
  const date = new Date(game.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/app/games/${game.id}`}
      className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-4 transition active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{game.name}</p>
        <p className="text-xs text-muted">
          {date}
          {game.location ? ` · ${game.location}` : ""}
        </p>
      </div>
      <StatusBadge status={game.status} />
    </Link>
  );
}
