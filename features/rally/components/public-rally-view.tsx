"use client";

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RallyExperience } from "@/features/rally/components/rally-experience";
import { RallyStatusBadge } from "@/features/rally/components/rally-status-badge";
import type { RallyView } from "@/features/rally/view";
import { cn } from "@/lib/utils";

type VisitedRally = { token: string; title: string };

const VISITED_KEY = "oth-rallies-visited";

function rememberVisit(token: string, title: string): VisitedRally[] {
  try {
    const list: VisitedRally[] = JSON.parse(window.localStorage.getItem(VISITED_KEY) ?? "[]");
    const next = [{ token, title }, ...list.filter((r) => r.token !== token)].slice(0, 8);
    window.localStorage.setItem(VISITED_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [{ token, title }];
  }
}

export function PublicRallyView({ view }: { view: RallyView }) {
  const { rally } = view;
  const [visited, setVisited] = useState<VisitedRally[]>([]);

  useEffect(() => {
    setVisited(rememberVisit(rally.public_token, rally.title));
  }, [rally.public_token, rally.title]);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md space-y-5 px-4 pb-10 pt-6 text-cream lg:max-w-4xl">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-brand">On the House · Rally</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-black text-white">{rally.title}</h1>
          <RallyStatusBadge status={rally.status} />
        </div>
        {rally.description ? <p className="text-sm leading-6 text-muted">{rally.description}</p> : null}
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          {view.hasEnded
            ? `Finished · ${view.totalDays} days`
            : view.hasStarted
              ? `Day ${view.dayNumber} of ${view.totalDays}`
              : `Starts ${rally.start_date}`}
        </p>
        {visited.length > 1 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {visited.map((r) => (
              <Link
                key={r.token}
                href={`/r/${r.token}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  r.token === rally.public_token
                    ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                    : "border-border bg-elevated text-muted",
                )}
              >
                {r.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <RallyExperience view={view} />

      <p className="pt-2 text-center text-xs text-muted">rallying on the house · house party games</p>
    </div>
  );
}
