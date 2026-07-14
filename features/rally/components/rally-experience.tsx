"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarDays, Camera, CheckCircle2, Crown, Flame, Loader2, Send, Trophy, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { castVote, hostDecideCheckIn, submitCheckIn } from "@/features/rally/actions";
import { CheckInCard } from "@/features/rally/components/check-in-card";
import { DayDotsStrip } from "@/features/rally/components/day-dots";
import { RallyCalendar } from "@/features/rally/components/rally-calendar";
import type { RallyView } from "@/features/rally/view";
import { cn } from "@/lib/utils";

type Tab = "today" | "standings" | "calendar";

/**
 * Mobile-first member experience: one compact hero (identity + streak + the
 * check-in action in a bottom sheet), then tabs — nothing stacks. Used by the
 * public room (on-device identity picker) and the host room (fixed identity).
 */
export function RallyExperience({
  view,
  fixedMemberId,
  hostControls = false,
}: {
  view: RallyView;
  fixedMemberId?: string | null;
  hostControls?: boolean;
}) {
  const router = useRouter();
  const { rally, members, standings, todayFeed, recentFeed } = view;
  const storageKey = `oth-rally-member:${rally.public_token}`;
  const usePicker = fixedMemberId === undefined;

  const reducedMotion = useReducedMotion();
  const [tab, setTab] = useState<Tab>("today");
  const [pickedMemberId, setPickedMemberId] = useState<string | null>(null);
  const [identityLoaded, setIdentityLoaded] = useState(!usePicker);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberId = usePicker ? pickedMemberId : fixedMemberId;

  useEffect(() => {
    if (!usePicker) return;

    const stored = window.localStorage.getItem(storageKey);

    if (stored && members.some((m) => m.id === stored)) {
      setPickedMemberId(stored);
    }

    setIdentityLoaded(true);
  }, [usePicker, storageKey, members]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }

    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const me = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  const myStanding = standings.find((s) => s.memberId === memberId);
  const active = rally.status === "active";
  const canCheckInToday = active && view.hasStarted && !view.hasEnded && me !== null && !me.checkedInToday;
  const checkedInCount = members.filter((m) => m.checkedInToday).length;
  const pendingApprovals = todayFeed.filter((c) => c.status === "pending").length + recentFeed.filter((c) => c.status === "pending").length;

  function pickIdentity(id: string) {
    window.localStorage.setItem(storageKey, id);
    setPickedMemberId(id);
    setError(null);
  }

  function clearIdentity() {
    window.localStorage.removeItem(storageKey);
    setPickedMemberId(null);
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
      setSheetOpen(false);
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

  function decide(checkInId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      const result = await hostDecideCheckIn({ rallyId: rally.id, checkInId, decision });

      if (!result.ok) {
        setError(result.message ?? "Could not save the decision.");
        return;
      }

      router.refresh();
    });
  }

  const tabs: { value: Tab; label: string; badge?: number }[] = [
    { value: "today", label: "Today", badge: pendingApprovals > 0 ? pendingApprovals : undefined },
    { value: "standings", label: "Standings" },
    { value: "calendar", label: "Calendar" },
  ];

  return (
    <div className="space-y-4">
      {/* identity picker (public room, first visit) */}
      {identityLoaded && usePicker && !me ? (
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

      {/* compact hero: me + streak + THE action */}
      {me ? (
        <Card className={cn("space-y-3", me.checkedInToday ? "border-success/40" : "bg-gold-tint shadow-red-glow")}>
          <div className="flex items-center gap-3">
            <PlayerAvatar name={me.name} colorKey={me.colorKey} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {me.name}
                {me.isHostMember ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
              </p>
              {myStanding ? <DayDotsStrip cells={myStanding.dayCells} /> : null}
            </div>
            {myStanding ? (
              <div className="flex shrink-0 items-center gap-3 text-center">
                <motion.div
                  key={`streak-${myStanding.currentStreak}`}
                  initial={reducedMotion ? false : { scale: 0.6 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 14 }}
                >
                  <p className={cn("text-2xl font-black tabular-nums", myStanding.currentStreak > 0 ? "text-red-danger" : "text-muted")}>
                    <Flame className="mb-0.5 inline h-5 w-5" />
                    {myStanding.currentStreak}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-muted">streak</p>
                </motion.div>
                <div>
                  <p className="text-2xl font-black tabular-nums text-white">{Math.round(myStanding.commitmentPercent)}%</p>
                  <p className="text-[10px] font-bold uppercase text-muted">committed</p>
                </div>
              </div>
            ) : null}
            {usePicker ? (
              <button type="button" aria-label="Switch member" className="shrink-0 text-xs text-muted underline" onClick={clearIdentity}>
                Not you?
              </button>
            ) : null}
          </div>

          {me.checkedInToday ? (
            <motion.p
              initial={reducedMotion || !justCheckedIn ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="flex items-center gap-2 rounded-2xl bg-success/10 px-3 py-2 text-sm font-bold text-success"
            >
              <CheckCircle2 className="h-5 w-5" />
              {justCheckedIn ? `Day ${view.dayNumber} locked in! 🔥` : `Day ${view.dayNumber} done. See you tomorrow!`}
            </motion.p>
          ) : canCheckInToday ? (
            <Button className="h-13 w-full" onClick={() => setSheetOpen(true)}>
              <Send className="h-5 w-5" />
              Check in for day {view.dayNumber}
            </Button>
          ) : (
            <p className="text-sm text-muted">
              {!active ? "This rally is no longer active." : view.hasEnded ? "The rally has ended." : `Check-ins open on ${rally.start_date}.`}
            </p>
          )}
        </Card>
      ) : null}

      {/* tab bar */}
      <div className="sticky top-[3.6rem] z-10 -mx-1 rounded-full border border-border bg-background/95 p-1 backdrop-blur lg:top-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={cn(
                "relative min-h-10 rounded-full text-sm font-bold transition-colors",
                tab === t.value ? "bg-elevated text-white" : "text-muted",
              )}
            >
              {t.label}
              {t.badge ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-black text-background">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      {tab === "today" ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            Day {view.dayNumber} of {view.totalDays} · {checkedInCount}/{members.length} checked in
          </p>
          {todayFeed.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">
                {me && canCheckInToday ? "Nobody has checked in yet today. Be the first." : "Nobody has checked in yet today."}
              </p>
            </Card>
          ) : (
            todayFeed.map((checkIn) => (
              <CheckInCard
                key={checkIn.id}
                checkIn={checkIn}
                viewerMemberId={memberId}
                onVote={active ? vote : undefined}
                onHostDecide={hostControls && active ? decide : undefined}
                disabled={isPending}
              />
            ))
          )}
        </div>
      ) : null}

      {tab === "standings" ? (
        <div className="space-y-2">
          {standings.map((standing, index) => (
            <div
              key={standing.memberId}
              className={cn(
                "flex items-center gap-3 rounded-[20px] border bg-elevated p-3",
                standing.memberId === memberId ? "border-gold-brand/50" : "border-border",
              )}
            >
              <span className="w-6 text-center text-sm font-black tabular-nums text-muted">
                {index === 0 ? <Trophy className="inline h-4 w-4 text-gold-brand" /> : index + 1}
              </span>
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
        </div>
      ) : null}

      {tab === "calendar" ? (
        <div className="space-y-5">
          {myStanding ? (
            <Card>
              <RallyCalendar cells={myStanding.dayCells} />
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-muted">Pick who you are to see your calendar.</p>
            </Card>
          )}
          {recentFeed.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white">Earlier check-ins</h2>
              {recentFeed.map((checkIn) => (
                <CheckInCard
                  key={checkIn.id}
                  checkIn={checkIn}
                  showDate
                  viewerMemberId={memberId}
                  onVote={active ? vote : undefined}
                  onHostDecide={hostControls && active ? decide : undefined}
                  disabled={isPending}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* check-in bottom sheet */}
      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`Check in — day ${view.dayNumber}`}>
        <div className="space-y-3">
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
          {error ? (
            <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
          ) : null}
          <Button className="h-13 w-full" disabled={isPending} onClick={checkIn}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Lock in day {view.dayNumber}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
