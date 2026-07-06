"use client";

import { CalendarDays, CheckCircle2, Crown, Flame, Loader2, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cancelRally, completeRally, hostDecideCheckIn, reactivateRally } from "@/features/rally/actions";
import { CheckInCard } from "@/features/rally/components/check-in-card";
import { DayDotsStrip } from "@/features/rally/components/day-dots";
import type { RallyView } from "@/features/rally/view";
import { cn } from "@/lib/utils";

export function RallyRoom({ view }: { view: RallyView }) {
  const { rally, standings, todayFeed, recentFeed, members } = view;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "cancel" | null>(null);

  const active = rally.status === "active";
  const checkedInCount = members.filter((m) => m.checkedInToday).length;

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) setError(result.message ?? "Something went wrong.");
    });
  }

  function decide(checkInId: string, decision: "approved" | "rejected") {
    run(() => hostDecideCheckIn({ rallyId: rally.id, checkInId, decision }));
  }

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-5">
        <Card className="space-y-1 bg-gold-tint">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <CalendarDays className="h-4 w-4" />
            {view.hasEnded ? "Rally finished" : view.hasStarted ? `Day ${view.dayNumber} of ${view.totalDays}` : `Starts ${rally.start_date}`}
          </div>
          <p className="text-3xl font-black tabular-nums text-white">
            {checkedInCount}/{members.length}
          </p>
          <p className="text-xs text-muted">checked in today</p>
          {view.hasStarted && !view.hasEnded ? (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-gold-brand transition-all"
                style={{ width: `${Math.round((view.dayNumber / view.totalDays) * 100)}%` }}
              />
            </div>
          ) : null}
        </Card>

        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-brand" />
            <h2 className="font-bold text-white">Standings</h2>
          </div>
          {standings.map((standing, index) => (
            <div key={standing.memberId} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
              <span className="w-6 text-center text-sm font-black tabular-nums text-muted">{index + 1}</span>
              <PlayerAvatar name={standing.name} colorKey={standing.colorKey} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {standing.name}
                  {standing.isHostMember ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                  {standing.checkedInToday ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-success" /> : null}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <DayDotsStrip cells={standing.dayCells} />
                  {standing.approvedCheckIns}/{standing.totalCheckIns} approved
                </p>
              </div>
              <div className="text-right">
                <p className="font-black tabular-nums text-white">{Math.round(standing.commitmentPercent)}%</p>
                <p className={cn("text-xs font-bold tabular-nums", standing.currentStreak > 0 ? "text-red-danger" : "text-muted")}>
                  <Flame className="mr-0.5 inline h-3 w-3" />
                  {standing.currentStreak}
                </p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="space-y-5">
        <section className="space-y-2">
          <h2 className="font-bold text-white">Today's check-ins</h2>
          {todayFeed.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Nobody has checked in yet today. Share the rally link to get them moving.</p>
            </Card>
          ) : (
            todayFeed.map((checkIn) => (
              <CheckInCard key={checkIn.id} checkIn={checkIn} onHostDecide={active ? decide : undefined} disabled={isPending} />
            ))
          )}
        </section>

        {recentFeed.length > 0 ? (
          <section className="space-y-2">
            <h2 className="font-bold text-white">Earlier</h2>
            {recentFeed.map((checkIn) => (
              <CheckInCard key={checkIn.id} checkIn={checkIn} showDate onHostDecide={active ? decide : undefined} disabled={isPending} />
            ))}
          </section>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
        ) : null}

        {active ? (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={isPending} onClick={() => setConfirmAction("complete")}>
              <CheckCircle2 className="h-4 w-4 text-success" />
              Complete
            </Button>
            <Button variant="secondary" className="flex-1 border-red-danger/40 text-red-danger" disabled={isPending} onClick={() => setConfirmAction("cancel")}>
              <XCircle className="h-4 w-4" />
              Cancel rally
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="w-full" disabled={isPending} onClick={() => run(() => reactivateRally(rally.id))}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reactivate rally
          </Button>
        )}
      </div>

      <BottomSheet
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction === "complete" ? "Complete the rally?" : "Cancel the rally?"}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {confirmAction === "complete"
              ? "Standings freeze and members can no longer check in."
              : "The rally moves to history as cancelled. Check-ins are kept."}
          </p>
          <Button
            variant={confirmAction === "complete" ? "default" : "destructive"}
            className="w-full"
            disabled={isPending}
            onClick={() => {
              const action = confirmAction;
              setConfirmAction(null);
              run(() => (action === "complete" ? completeRally(rally.id) : cancelRally(rally.id)));
            }}
          >
            {confirmAction === "complete" ? "Yes, complete it" : "Yes, cancel it"}
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmAction(null)}>
            Keep going
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
