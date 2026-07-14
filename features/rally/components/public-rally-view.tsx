"use client";

import { BadgeCheck, CalendarDays, Clock, Flame, Loader2, LogIn, Send, ThumbsUp, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestToJoinRally } from "@/features/rally/actions";
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

export function PublicRallyView({
  view,
  linkedMemberId = null,
  signedIn = false,
  requestStatus = null,
}: {
  view: RallyView;
  /** Member seat linked to the signed-in account — verified identity, no picker. */
  linkedMemberId?: string | null;
  signedIn?: boolean;
  requestStatus?: "pending" | "approved" | "declined" | null;
}) {
  const router = useRouter();
  const { rally } = view;
  const [visited, setVisited] = useState<VisitedRally[]>([]);
  const [storedIdentity, setStoredIdentity] = useState<boolean | null>(null);
  const [crewMode, setCrewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setVisited(rememberVisit(rally.public_token, rally.title));

    const stored = window.localStorage.getItem(`oth-rally-member:${rally.public_token}`);
    setStoredIdentity(Boolean(stored && view.members.some((m) => m.id === stored)));
  }, [rally.public_token, rally.title, view.members]);

  const identityKnown = Boolean(linkedMemberId) || storedIdentity === true;
  const showInvitation = storedIdentity !== null && !identityKnown && !crewMode;

  function requestJoin() {
    startTransition(async () => {
      const result = await requestToJoinRally(rally.public_token);

      if (!result.ok) {
        setError(result.message ?? "Could not send the request.");
        return;
      }

      router.refresh();
    });
  }

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
          <span>· {view.members.length} members</span>
        </p>
        {!showInvitation && visited.length > 1 ? (
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

      {showInvitation ? (
        <div className="space-y-4">
          <Card className="space-y-4 bg-gold-tint shadow-red-glow">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-danger">You're invited</p>
              <h2 className="text-xl font-black text-white">Join the {rally.title} rally</h2>
              <p className="text-sm leading-6 text-muted">
                {view.members.length} people are holding each other to it{view.hasStarted ? ` — ${view.totalDays - view.dayNumber} days still to go` : ""}. Your streak starts the day you're in.
              </p>
            </div>

            <div className="space-y-2 text-sm text-cream">
              <p className="flex items-center gap-2.5">
                <Send className="h-4 w-4 shrink-0 text-gold-brand" />
                Check in every day with proof — a photo and a line on what you did.
              </p>
              <p className="flex items-center gap-2.5">
                <ThumbsUp className="h-4 w-4 shrink-0 text-gold-brand" />
                The crew votes on each other's check-ins. No freebies.
              </p>
              <p className="flex items-center gap-2.5">
                <Flame className="h-4 w-4 shrink-0 text-gold-brand" />
                Streaks and commitment are public. Keep the fire alive.
              </p>
            </div>

            {requestStatus === "pending" ? (
              <p className="flex items-center gap-2 rounded-2xl bg-warning/10 px-3 py-2.5 text-sm font-bold text-warning">
                <Clock className="h-5 w-5" />
                Request sent — waiting for the host to wave you in.
              </p>
            ) : requestStatus === "declined" ? (
              <p className="flex items-center gap-2 rounded-2xl bg-red-danger/10 px-3 py-2.5 text-sm font-bold text-red-danger">
                <XCircle className="h-5 w-5" />
                The host declined this request.
              </p>
            ) : signedIn ? (
              <Button className="h-13 w-full" disabled={isPending} onClick={requestJoin}>
                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
                Request to join
              </Button>
            ) : (
              <div className="space-y-2">
                <Button asChild className="h-13 w-full">
                  <Link href={`/sign-in?redirect_url=${encodeURIComponent(`/r/${rally.public_token}`)}`}>
                    <LogIn className="h-5 w-5" />
                    Sign in with email to join
                  </Link>
                </Button>
                <p className="text-center text-xs text-muted">The host approves every request before you're in.</p>
              </div>
            )}

            {error ? (
              <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
            ) : null}
          </Card>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-elevated px-4 py-3 text-sm font-semibold text-muted"
            onClick={() => setCrewMode(true)}
          >
            <Users className="h-4 w-4" />
            Already part of the crew? Pick your seat
          </button>
        </div>
      ) : null}

      {!showInvitation && storedIdentity !== null ? (
        <RallyExperience view={view} fixedMemberId={linkedMemberId ?? undefined} />
      ) : null}

      <p className="pt-2 text-center text-xs text-muted">rallying on the house · house party games</p>
    </div>
  );
}
