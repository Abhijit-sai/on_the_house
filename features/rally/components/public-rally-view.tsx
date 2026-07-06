"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Camera, CheckCircle2, Crown, Flame, Loader2, Send, Trophy, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { castVote, submitCheckIn } from "@/features/rally/actions";
import { CheckInCard } from "@/features/rally/components/check-in-card";
import { DayDotsGrid, DayDotsStrip } from "@/features/rally/components/day-dots";
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
  const router = useRouter();
  const { rally, members, standings, todayFeed, recentFeed } = view;
  const storageKey = `oth-rally-member:${rally.public_token}`;

  const reducedMotion = useReducedMotion();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [visited, setVisited] = useState<VisitedRally[]>([]);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }

    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);

    if (stored && members.some((m) => m.id === stored)) {
      setMemberId(stored);
    }

    setIdentityLoaded(true);
    setVisited(rememberVisit(rally.public_token, rally.title));
  }, [storageKey, members, rally.public_token, rally.title]);

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
      const formData = new FormData();
      formData.set("token", rally.public_token);
      formData.set("memberId", memberId);

      if (message.trim()) formData.set("message", message.trim());
      if (proofFile) formData.set("proof", proofFile);

      const result = await submitCheckIn(formData);

      if (!result.ok) {
        setError(result.message ?? "Could not check in.");
        return;
      }

      setMessage("");
      setProofFile(null);
      setJustCheckedIn(true);
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
            <Card className={cn("space-y-4", me.checkedInToday ? "border-success/40 shadow-glow" : "bg-gold-tint shadow-red-glow")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PlayerAvatar name={me.name} colorKey={me.colorKey} size="sm" />
                  <p className="text-sm font-bold text-white">{me.name}</p>
                </div>
                <button type="button" className="text-xs text-muted underline" onClick={clearIdentity}>
                  Not you?
                </button>
              </div>

              {myStanding ? (
                <div className="flex items-center justify-around text-center">
                  <motion.div
                    key={`streak-${myStanding.currentStreak}`}
                    initial={reducedMotion ? false : { scale: 0.6 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                  >
                    <p
                      className={cn(
                        "text-4xl font-black tabular-nums",
                        myStanding.currentStreak > 0 ? "text-red-danger" : "text-muted",
                      )}
                    >
                      <Flame className="mb-1 mr-1 inline h-7 w-7" />
                      {myStanding.currentStreak}
                    </p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">streak</p>
                  </motion.div>
                  <div>
                    <p className="text-4xl font-black tabular-nums text-white">{Math.round(myStanding.commitmentPercent)}%</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">committed</p>
                  </div>
                  <div>
                    <p className="text-4xl font-black tabular-nums text-gold-brand">{myStanding.bestStreak}</p>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">best</p>
                  </div>
                </div>
              ) : null}

              {myStanding ? <DayDotsGrid cells={myStanding.dayCells} /> : null}

              {me.checkedInToday ? (
                <motion.p
                  initial={reducedMotion || !justCheckedIn ? false : { scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 240, damping: 14 }}
                  className="flex items-center gap-2 rounded-2xl bg-success/10 px-3 py-2.5 text-sm font-bold text-success"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {justCheckedIn
                    ? `Day ${view.dayNumber} locked in! 🔥 The streak lives.`
                    : "Checked in for today. See you tomorrow!"}
                </motion.p>
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />
                  {proofPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proofPreview} alt="Proof preview" className="max-h-48 w-full rounded-2xl border border-border object-cover" />
                      <button
                        type="button"
                        aria-label="Remove photo"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                        onClick={() => {
                          setProofFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button type="button" variant="secondary" className="w-full" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="h-4 w-4" />
                      Add proof photo
                    </Button>
                  )}
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
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <DayDotsStrip cells={standing.dayCells} />
                    best {standing.bestStreak}
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
