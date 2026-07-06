"use client";

import { CalendarDays, CheckCircle2, Crown, Flame, Loader2, Send, Trophy, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { castVote, submitCheckIn } from "@/features/rally/actions";
import { CheckInCard } from "@/features/rally/components/check-in-card";
import { RallyStatusBadge } from "@/features/rally/components/rally-status-badge";
import type { RallyView } from "@/features/rally/view";
import { cn } from "@/lib/utils";

export function PublicRallyView({ view }: { view: RallyView }) {
  const router = useRouter();
  const { rally, members, standings, todayFeed, recentFeed } = view;
  const storageKey = `oth-rally-member:${rally.public_token}`;

  const [memberId, setMemberId] = useState<string | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (stored && members.some((m) => m.id === stored)) {
      setMemberId(stored);
    }

    setIdentityLoaded(true);
  }, [storageKey, members]);

  const me = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  const myStanding = standings.find((s) => s.memberId === memberId);
  const active = rally.status === "active";
  const canCheckInToday = active && view.hasStarted && !view.hasEnded && me !== null && !me.checkedInToday;

  function pickIdentity(id: string) {
    window.localStorage.setItem(storageKey, id);
    setMemberId(id);
    setError(null);
  }

  function clearIdentity() {
    window.localStorage.removeItem(storageKey);
    setMemberId(null);
    setError(null);
  }

  function checkIn() {
    if (!memberId) return;

    startTransition(async () => {
      const result = await submitCheckIn({ token: rally.public_token, memberId, message: message.trim() || undefined });

      if (!result.ok) {
        setError(result.message ?? "Could not check in.");
        return;
      }

      setMessage("");
      router.refresh();
    });
  }

  function vote(checkInId: string, value: boolean) {
    if (!memberId) return;

    startTransition(async () => {
      const result = await castVote({ token: rally.public_token, voterMemberId: memberId, checkInId, vote: value });

      if (!result.ok) {
        setError(result.message ?? "Could not vote.");
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
        </p>
      </div>

      {identityLoaded && !me ? (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-gold-brand" />
            <h2 className="font-bold text-white">Who are you?</h2>
          </div>
          <p className="text-xs text-muted">Pick yourself once — this device remembers.</p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => pickIdentity(member.id)}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-sm font-semibold text-cream"
              >
                <PlayerAvatar name={member.name} colorKey={member.colorKey} size="sm" />
                {member.name}
              </button>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-5">
          {me ? (
            <Card className={cn("space-y-3", me.checkedInToday ? "border-success/40" : "bg-gold-tint shadow-red-glow")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayerAvatar name={me.name} colorKey={me.colorKey} size="sm" />
                  <div>
                    <p className="text-sm font-bold text-white">{me.name}</p>
                    {myStanding ? (
                      <p className="text-xs text-muted">
                        <Flame className="mr-0.5 inline h-3 w-3 text-red-danger" />
                        {myStanding.currentStreak} streak · {Math.round(myStanding.commitmentPercent)}% committed
                      </p>
                    ) : null}
                  </div>
                </div>
                <button type="button" className="text-xs text-muted underline" onClick={clearIdentity}>
                  Not you?
                </button>
              </div>

              {me.checkedInToday ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  Checked in for today. See you tomorrow!
                </p>
              ) : canCheckInToday ? (
                <div className="space-y-2">
                  <Input
                    placeholder="What did you do today? (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        checkIn();
                      }
                    }}
                  />
                  <Button className="h-13 w-full" disabled={isPending} onClick={checkIn}>
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    Check in for day {view.dayNumber}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  {!active ? "This rally is no longer active." : view.hasEnded ? "The rally has ended." : `Check-ins open on ${rally.start_date}.`}
                </p>
              )}
            </Card>
          ) : null}

          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold-brand" />
              <h2 className="font-bold text-white">Standings</h2>
            </div>
            {standings.map((standing, index) => (
              <div
                key={standing.memberId}
                className={cn(
                  "flex items-center gap-3 rounded-[20px] border bg-elevated p-3",
                  standing.memberId === memberId ? "border-gold-brand/50" : "border-border",
                )}
              >
                <span className="w-6 text-center text-sm font-black tabular-nums text-muted">{index + 1}</span>
                <PlayerAvatar name={standing.name} colorKey={standing.colorKey} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {standing.name}
                    {standing.isHostMember ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                    {standing.checkedInToday ? <CheckCircle2 className="ml-1.5 inline h-3.5 w-3.5 text-success" /> : null}
                  </p>
                  <p className="text-xs text-muted">best streak {standing.bestStreak}</p>
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

        <div className="mt-5 space-y-5 lg:mt-0">
          <section className="space-y-2">
            <h2 className="font-bold text-white">Today's check-ins</h2>
            {todayFeed.length === 0 ? (
              <Card>
                <p className="text-sm text-muted">Nobody has checked in yet today. Be the first.</p>
              </Card>
            ) : (
              todayFeed.map((checkIn) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  viewerMemberId={memberId}
                  onVote={active ? vote : undefined}
                  disabled={isPending}
                />
              ))
            )}
          </section>

          {recentFeed.length > 0 ? (
            <section className="space-y-2">
              <h2 className="font-bold text-white">Earlier</h2>
              {recentFeed.map((checkIn) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  showDate
                  viewerMemberId={memberId}
                  onVote={active ? vote : undefined}
                  disabled={isPending}
                />
              ))}
            </section>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
          ) : null}
        </div>
      </div>

      <p className="pt-2 text-center text-xs text-muted">rallying on the house · house party games</p>
    </div>
  );
}
