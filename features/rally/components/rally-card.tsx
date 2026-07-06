import { Flame } from "lucide-react";
import Link from "next/link";
import type { Rally } from "@/db/types/database";
import { RallyStatusBadge } from "@/features/rally/components/rally-status-badge";

export function RallyCard({ rally }: { rally: Rally }) {
  return (
    <Link
      href={`/app/rallies/${rally.id}`}
      className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-4 transition active:scale-[0.99]"
    >
      <Flame className="h-5 w-5 shrink-0 text-red-danger" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-white">{rally.title}</p>
        <p className="text-xs text-muted">
          {rally.start_date} → {rally.end_date}
        </p>
      </div>
      <RallyStatusBadge status={rally.status} />
    </Link>
  );
}
