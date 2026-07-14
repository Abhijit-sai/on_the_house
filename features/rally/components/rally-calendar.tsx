import type { DayCell } from "@/features/rally/engine";
import { cn } from "@/lib/utils";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

const cellStyles: Record<DayCell["state"], string> = {
  approved: "bg-success text-background",
  pending: "bg-warning text-background",
  rejected: "bg-red-danger text-background",
  missed: "bg-surface text-muted ring-1 ring-inset ring-border",
  open: "bg-gold-tint text-gold-brand ring-2 ring-inset ring-gold-brand",
  future: "bg-surface/40 text-muted/60",
};

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** A real calendar: month grids aligned to weekdays, one cell per rally day. */
export function RallyCalendar({ cells }: { cells: DayCell[] }) {
  const months = new Map<string, DayCell[]>();

  for (const cell of cells) {
    const key = cell.date.slice(0, 7);
    const list = months.get(key) ?? [];
    list.push(cell);
    months.set(key, list);
  }

  return (
    <div className="space-y-5">
      {[...months.entries()].map(([monthKey, monthCells]) => {
        const firstWeekday = new Date(`${monthCells[0].date}T00:00:00Z`).getUTCDay();

        return (
          <div key={monthKey} className="space-y-2">
            <p className="text-sm font-bold text-white">{monthLabel(monthKey)}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {weekdays.map((day, index) => (
                <span key={`${day}-${index}`} className="pb-1 text-center text-[10px] font-bold uppercase text-muted">
                  {day}
                </span>
              ))}
              {Array.from({ length: firstWeekday }).map((_, index) => (
                <span key={`pad-${index}`} />
              ))}
              {monthCells.map((cell) => (
                <span
                  key={cell.date}
                  title={cell.date}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl text-xs font-bold tabular-nums",
                    cellStyles[cell.state],
                  )}
                >
                  {Number(cell.date.slice(8, 10))}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> approved</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> awaiting votes</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-danger" /> rejected</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-surface ring-1 ring-border" /> missed</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold-tint ring-1 ring-gold-brand" /> today</span>
      </div>
    </div>
  );
}
