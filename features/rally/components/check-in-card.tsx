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
  /** current identity in the public room; enables vote buttons on others' check-ins */
  viewerMemberId?: string | null;
  onVote?: (checkInId: string, vote: boolean) => void;
  onHostDecide?: (checkInId: string, decision: "approved" | "rejected") => void;
  disabled?: boolean;
}) {
  const chip = statusChips[checkIn.status];
  const canVote = Boolean(onVote && viewerMemberId && viewerMemberId !== checkIn.memberId && !checkIn.decidedByHost);
  const hasVoted = Boolean(viewerMemberId && checkIn.voterIds.includes(viewerMemberId));

  return (
    <div className="rounded-[20px] border border-border bg-elevated p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar name={checkIn.memberName} colorKey={checkIn.colorKey} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{checkIn.memberName}</p>
          <p className="text-xs text-muted">
            {showDate ? `${checkIn.date} · ` : ""}
            {checkIn.yesVotes}👍 {checkIn.noVotes}👎 of {checkIn.eligibleVoters}
            {checkIn.decidedByHost ? " · host ruled" : ""}
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", chip.className)}>{chip.label}</span>
      </div>

      {checkIn.message ? <p className="mt-2 text-sm leading-6 text-cream">{checkIn.message}</p> : null}

      {canVote ? (
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 border-success/40 text-success"
            disabled={disabled}
            onClick={() => onVote?.(checkIn.id, true)}
          >
            <ThumbsUp className="h-4 w-4" />
            {hasVoted ? "Change to yes" : "Legit"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 border-red-danger/40 text-red-danger"
            disabled={disabled}
            onClick={() => onVote?.(checkIn.id, false)}
          >
            <ThumbsDown className="h-4 w-4" />
            {hasVoted ? "Change to no" : "Doubt it"}
          </Button>
        </div>
      ) : null}

      {onHostDecide && !checkIn.decidedByHost ? (
        <div className="mt-3 flex items-center gap-2">
          <Gavel className="h-4 w-4 shrink-0 text-gold-brand" />
          <Button size="sm" variant="secondary" className="flex-1" disabled={disabled} onClick={() => onHostDecide(checkIn.id, "approved")}>
            <Check className="h-4 w-4 text-success" />
            Approve
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" disabled={disabled} onClick={() => onHostDecide(checkIn.id, "rejected")}>
            <X className="h-4 w-4 text-red-danger" />
            Reject
          </Button>
        </div>
      ) : null}
    </div>
  );
}
