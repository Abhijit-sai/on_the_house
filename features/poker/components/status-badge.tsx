import type { GameStatus } from "@/db/types/database";
import { cn } from "@/lib/utils";

const statusConfig: Record<GameStatus, { label: string; className: string; pulse?: boolean }> = {
  draft: { label: "Draft", className: "bg-gold-brand/10 text-gold-deep border-gold-deep/40" },
  live: { label: "Live", className: "bg-success/15 text-success border-success/40", pulse: true },
  paused: { label: "Paused", className: "bg-warning/15 text-warning border-warning/40" },
  tally_pending: { label: "Tally Pending", className: "bg-warning/15 text-warning border-warning/40" },
  pending_settlement: { label: "Pending Settlement", className: "bg-gold-brand/15 text-gold-brand border-gold-brand/40" },
  closed: { label: "Closed", className: "bg-success/10 text-success border-success/30" },
  cancelled: { label: "Cancelled", className: "bg-muted/10 text-muted border-muted/30" },
};

export function StatusBadge({ status, className }: { status: GameStatus; className?: string }) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
        config.className,
        className,
      )}
    >
      {config.pulse ? <span className="live-pulse h-2 w-2 rounded-full bg-success" /> : null}
      {config.label}
    </span>
  );
}
