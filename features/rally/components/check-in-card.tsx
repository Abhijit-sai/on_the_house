"use client";

import { Check, Gavel, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { Button } from "@/components/ui/button";
import type { CheckInView } from "@/features/rally/view";
import { cn } from "@/lib/utils";

const statusChips = {
  pending: { label: "Awaiting votes", className: "bg-warning/15 text-warning" },
  approved: { label: "Approved", className: "bg-success/15 text-success" },
  rejected: { label: "Rejected", className: "bg-red-danger/15 text-red-danger" },
} as const;

export function CheckInCard({
  checkIn,
  showDate = false,
  viewerMemberId,
  onVote,
  onHostDecide,
  disabled,
}: {
  checkIn: CheckInView;
  showDate?: boolean;
  /** current identity; enables vote buttons on others' check-ins */
  viewerMemberId?: string | null;
  onVote?: (checkInId: string, vote: boolean) => void;
  onHostDecide?: (checkInId: string, decision: "approved" | "rejected") => void;
  disabled?: boolean;
}) {
  const chip = statusChips[checkIn.status];
  const canVote = Boolean(onVote && viewerMemberId && viewerMemberId !== checkIn.memberId && !checkIn.decidedByHost);
  const myVote = viewerMemberId !== null && viewerMemberId !== undefined ? checkIn.votesByVoter[viewerMemberId] : undefined;

  return (
    <div className="rounded-[20px] border border-border bg-elevated p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={checkIn.memberName} colorKey={checkIn.colorKey} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{checkIn.memberName}</p>
          <p className="text-xs text-muted">
            {showDate ? `${checkIn.date} · ` : ""}
            {checkIn.yesVotes}👍 {checkIn.noVotes}👎 of {checkIn.eligibleVoters}
            {checkIn.decidedByHost ? " · settled by host" : ""}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", chip.className)}>{chip.label}</span>
      </div>

      {checkIn.proofImageUrl ? (
        <a href={checkIn.proofImageUrl} target="_blank" rel="noreferrer" className="mt-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={checkIn.proofImageUrl}
            alt={`Proof from ${checkIn.memberName}`}
            loading="lazy"
            className="max-h-64 w-full rounded-2xl border border-border object-cover"
          />
        </a>
      ) : null}

      {checkIn.message ? <p className="mt-2 text-sm leading-6 text-cream">{checkIn.message}</p> : null}

      {canVote ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Your vote</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "flex-1 border-success/40 text-success",
                myVote === true && "bg-success/15 ring-1 ring-inset ring-success/50",
              )}
              disabled={disabled}
              onClick={() => onVote?.(checkIn.id, true)}
            >
              <ThumbsUp className="h-4 w-4" />
              Legit{myVote === true ? " ✓" : ""}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className={cn(
                "flex-1 border-red-danger/40 text-red-danger",
                myVote === false && "bg-red-danger/15 ring-1 ring-inset ring-red-danger/50",
              )}
              disabled={disabled}
              onClick={() => onVote?.(checkIn.id, false)}
            >
              <ThumbsDown className="h-4 w-4" />
              Doubt it{myVote === false ? " ✓" : ""}
            </Button>
          </div>
        </div>
      ) : null}

      {onHostDecide && !checkIn.decidedByHost ? (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gold-brand">
            <Gavel className="h-3.5 w-3.5" />
            Host ruling — final, overrules votes
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="flex-1 text-success" disabled={disabled} onClick={() => onHostDecide(checkIn.id, "approved")}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button size="sm" variant="ghost" className="flex-1 text-red-danger" disabled={disabled} onClick={() => onHostDecide(checkIn.id, "rejected")}>
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
