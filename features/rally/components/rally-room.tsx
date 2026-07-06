"use client";

import { CalendarDays, CheckCircle2, Loader2, RotateCcw, UserPlus, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { addRallyMember, cancelRally, claimHostSeat, completeRally, reactivateRally } from "@/features/rally/actions";
import { RallyExperience } from "@/features/rally/components/rally-experience";
import type { RallyView } from "@/features/rally/view";

type AddablePlayer = { id: string; name: string; colorKey: string | null };

/** Host room = the full member experience for the crowned seat + admin controls. */
export function RallyRoom({ view, addablePlayers = [] }: { view: RallyView; addablePlayers?: AddablePlayer[] }) {
  const { rally, members } = view;
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<"complete" | "cancel" | null>(null);

  const active = rally.status === "active";
  const hostSeat = members.find((m) => m.isHostMember) ?? null;
  const checkedInCount = members.filter((m) => m.checkedInToday).length;

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) setError(result.message ?? "Something went wrong.");
    });
  }

  return (
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

      {!hostSeat ? (
        <Card className="space-y-3 bg-gold-tint">
          <h2 className="font-bold text-white">Which one is you?</h2>
          <p className="text-xs text-muted">
            Claim your seat to check in, build your streak, and vote — right from here.
          </p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                disabled={isPending}
                onClick={() => run(() => claimHostSeat(rally.id, member.id))}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                <PlayerAvatar name={member.name} colorKey={member.colorKey} size="sm" />
                {member.name}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <RallyExperience view={view} fixedMemberId={hostSeat?.id ?? null} hostControls />

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      {active ? (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={isPending} onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
          <Button variant="secondary" className="flex-1" disabled={isPending} onClick={() => setConfirmAction("complete")}>
            <CheckCircle2 className="h-4 w-4 text-success" />
            Complete
          </Button>
          <Button
            variant="secondary"
            className="flex-1 border-red-danger/40 text-red-danger"
            disabled={isPending}
            onClick={() => setConfirmAction("cancel")}
          >
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

      <BottomSheet open={addOpen} onClose={() => setAddOpen(false)} title="Add a member mid-rally">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            They join from today — earlier days don't count against them. Manage your player crew on the Players page.
          </p>
          {addablePlayers.length === 0 ? (
            <p className="rounded-2xl border border-border bg-elevated p-3 text-sm text-muted">
              Everyone in your address book is already rallying. Add a new player on the Players page first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {addablePlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setAddOpen(false);
                    run(() => addRallyMember(rally.id, player.id));
                  }}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-60"
                >
                  <PlayerAvatar name={player.name} colorKey={player.colorKey} size="sm" />
                  {player.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

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
