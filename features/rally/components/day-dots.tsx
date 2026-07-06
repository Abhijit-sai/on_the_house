import type { DayCell } from "@/features/rally/engine";
import { cn } from "@/lib/utils";

const stateStyles: Record<DayCell["state"], string> = {
  approved: "bg-success",
  pending: "bg-warning",
  rejected: "bg-red-danger",
  missed: "bg-surface ring-1 ring-inset ring-border",
  open: "bg-gold-tint ring-2 ring-inset ring-gold-brand",
  future: "bg-surface/40",
};

const stateLabels: Record<DayCell["state"], string> = {
  approved: "approved",
  pending: "awaiting votes",
  rejected: "rejected",
  missed: "missed",
  open: "today — not checked in yet",
  future: "upcoming",
};

/** Compact single-row strip (last N days) for member rows. */
export function DayDotsStrip({ cells, count = 7 }: { cells: DayCell[]; count?: number }) {
  const visible = cells.filter((c) => c.state !== "future").slice(-count);

  return (
    <span className="inline-flex items-center gap-1">
      {visible.map((cell) => (
        <span
          key={cell.date}
          title={`${cell.date}: ${stateLabels[cell.state]}`}
          className={cn("h-2 w-2 rounded-full", stateStyles[cell.state])}
        />
      ))}
    </span>
  );
}

/** Full rally-window grid for the personal progress card. */
export function DayDotsGrid({ cells, startNumber = 1 }: { cells: DayCell[]; startNumber?: number }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
      {cells.map((cell, index) => (
        <div
          key={cell.date}
          title={`Day ${startNumber + index} · ${cell.date}: ${stateLabels[cell.state]}`}
          className={cn(
            "flex aspect-square items-center justify-center rounded-lg text-[10px] font-bold tabular-nums",
            stateStyles[cell.state],
            cell.state === "approved" || cell.state === "rejected" ? "text-background" : "text-muted",
            cell.state === "pending" ? "text-background" : "",
            cell.state === "open" ? "text-gold-brand" : "",
          )}
        >
          {startNumber + index}
        </div>
      ))}
    </div>
  );
}
