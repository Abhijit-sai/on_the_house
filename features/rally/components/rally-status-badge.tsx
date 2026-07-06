import type { RallyStatus } from "@/db/types/database";
import { cn } from "@/lib/utils";

const config: Record<RallyStatus, { label: string; className: string; pulse?: boolean }> = {
  draft: { label: "Draft", className: "bg-gold-brand/10 text-gold-deep border-gold-deep/40" },
  active: { label: "Active", className: "bg-success/15 text-success border-success/40", pulse: true },
  completed: { label: "Completed", className: "bg-success/10 text-success border-success/30" },
  cancelled: { label: "Cancelled", className: "bg-muted/10 text-muted border-muted/30" },
};

export function RallyStatusBadge({ status, className }: { status: RallyStatus; className?: string }) {
  const c = config[status];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold", c.className, className)}>
      {c.pulse ? <span className="live-pulse h-2 w-2 rounded-full bg-success" /> : null}
      {c.label}
    </span>
  );
}
