"use client";

import { ArrowLeft, Gavel, Hand, Minus, Moon, Plus, Skull, Sun, Timer, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  aliveSeats,
  backToDay,
  extendDay,
  lastEntry,
  lastNight,
  majorityOf,
  openVote,
  voteOutcome,
  voteRuleOf,
  walk,
  type GameState,
  type Seat,
  type Tally,
} from "@/features/mafia/engine";
import { ConfirmSheet, type Confirm } from "@/features/mafia/components/confirm-sheet";
import { RoleBadge, SayLine } from "@/features/mafia/components/role-card";
import { ROLES, lines } from "@/features/mafia/script";
import { sfx } from "@/features/mafia/sounds";
import { cn } from "@/lib/utils";

const SUSPENSE_MS = 1700;

/** Holds the reveal back for a beat, then plays its sound once. */
function useSuspense(ms: number, onReveal: () => void) {
  const [shown, setShown] = useState(false);
  const fire = useRef(onReveal);
  fire.current = onReveal;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setShown(true);
      fire.current();
    }, ms);
    return () => window.clearTimeout(t);
  }, [ms]);

  return shown;
}

function Stamp({ children, tone }: { children: string; tone: "red" | "green" | "cream" }) {
  return (
    <span
      className={cn(
        "stamp inline-block rounded-lg border-[3px] px-3 py-1 font-mono text-2xl font-black uppercase tracking-[0.2em]",
        tone === "red" && "border-red-danger text-red-danger",
        tone === "green" && "border-emerald-400 text-emerald-300",
        tone === "cream" && "border-cream/70 text-cream",
      )}
    >
      {children}
    </span>
  );
}

function WinnerOrNext({
  winner,
  next,
  onFinish,
}: {
  winner: boolean;
  next: { label: string; icon: typeof Sun; onClick: () => void; className?: string };
  onFinish: () => void;
}) {
  const Icon = next.icon;
  return winner ? (
    <Button
      size="lg"
      className="h-14 w-full bg-gold-brand text-base text-background shadow-glow hover:bg-gold-brand/90"
      onClick={onFinish}
    >
      <Trophy className="h-5 w-5" />
      See who won
    </Button>
  ) : (
    <Button size="lg" className={cn("h-14 w-full text-base", next.className)} onClick={next.onClick}>
      <Icon className="h-5 w-5" />
      {next.label}
    </Button>
  );
}

/* ------------------------------------------------------------------- dawn */

export function DawnSky() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#0c0710]">
      <div className="absolute inset-0 bg-gradient-to-t from-[#4a1d0c] via-[#1d0d1c] to-[#07060d]" />
      {/* centred by flex, because the rise animation owns `transform` */}
      <div className="absolute inset-x-0 -bottom-40 flex justify-center">
        <div className="sun-rise h-96 w-[130%] shrink-0 rounded-full bg-[#ff9d3c]/20 blur-3xl" />
      </div>
      <div className="absolute inset-x-0 -bottom-24 flex justify-center">
        <div className="sun-rise h-64 w-64 rounded-full bg-gradient-to-t from-[#ff8a3c] to-[#ffd27a] opacity-80 blur-sm" />
      </div>
    </div>
  );
}

export function DawnPhase({
  game,
  onStartDay,
  onFinish,
}: {
  game: GameState;
  onStartDay: () => void;
  onFinish: () => void;
}) {
  const ledger = useMemo(() => walk(game), [game]);
  const night = lastNight(game, ledger)!;
  const victim = night.killed ? game.seats.find((s) => s.seatId === night.killed)! : null;
  const seed = `${game.gameId}:n${night.night}`;

  const shown = useSuspense(SUSPENSE_MS, () => {
    if (victim) sfx.shot();
    else if (night.saved) sfx.saved();
    else sfx.quiet();
  });

  return (
    <div className="relative flex min-h-[78dvh] flex-col items-center justify-center gap-6 text-center">
      {!shown ? (
        <div className="fade-up space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-orange-200/80">Morning {night.night}</p>
          <h1 className="text-4xl font-black text-white">Dawn breaks…</h1>
          <p className="text-sm text-cream/60">The town stirs. Not everyone, maybe.</p>
        </div>
      ) : (
        <div className={cn("w-full space-y-5", victim && "shake")}>
          {victim ? (
            <>
              <div className="relative mx-auto w-fit">
                <PlayerAvatar
                  name={victim.name}
                  colorKey={victim.colorKey}
                  size="lg"
                  className="h-24 w-24 text-2xl grayscale"
                />
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                  <Stamp tone="red">Killed</Stamp>
                </div>
              </div>
              <div className="space-y-1 pt-2">
                <h1 className="text-3xl font-black text-white">{victim.name} is dead</h1>
                {game.settings.revealOnDeath ? (
                  <div className="card-flip flex justify-center pt-1">
                    <RoleBadge role={game.roles[victim.seatId]} className="px-3 py-1 text-xs" />
                  </div>
                ) : null}
              </div>
              <SayLine className="text-left">{lines.kill(seed, victim.name)}</SayLine>
              <p className="text-xs text-cream/60">{victim.name} is out — no talking, no pointing from here on.</p>
            </>
          ) : night.saved ? (
            <>
              <div className="chip-pop mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-400/70 bg-emerald-500/15 text-5xl shadow-[0_0_60px_rgba(52,211,153,0.45)]">
                🛡️
              </div>
              <Stamp tone="green">Saved</Stamp>
              <h1 className="text-3xl font-black text-white">Everyone survived</h1>
              <SayLine className="text-left">{lines.saved(seed)}</SayLine>
            </>
          ) : (
            <>
              <div className="chip-pop mx-auto text-6xl">🌤️</div>
              <h1 className="text-3xl font-black text-white">A quiet night</h1>
              <SayLine className="text-left">{lines.quiet(seed)}</SayLine>
            </>
          )}

          <WinnerOrNext
            winner={ledger.winner !== null}
            onFinish={onFinish}
            next={{
              label: `Start day ${night.night}`,
              icon: Sun,
              onClick: onStartDay,
              className: "bg-gold-brand text-background hover:bg-gold-brand/90",
            }}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- day */

function useNow(intervalMs = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function Roster({ game }: { game: GameState }) {
  const ledger = walk(game);
  return (
    <div className="grid grid-cols-4 gap-2">
      {game.seats.map((seat, i) => {
        const dead = !ledger.alive.has(seat.seatId);
        return (
          <div
            key={seat.seatId}
            style={{ animationDelay: `${i * 30}ms` }}
            className={cn(
              "fade-up flex flex-col items-center gap-1 rounded-2xl p-1.5 text-center",
              dead && "opacity-45",
            )}
          >
            <div className="relative">
              <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="md" className={cn(dead && "grayscale")} />
              {dead ? (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-xs">
                  {game.settings.revealOnDeath ? (
                    ROLES[game.roles[seat.seatId]].emoji
                  ) : (
                    <Skull className="h-3 w-3 text-muted" />
                  )}
                </span>
              ) : null}
            </div>
            <span
              className={cn("w-full truncate text-[11px] font-bold", dead ? "text-muted line-through" : "text-cream")}
            >
              {seat.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DayPhase({ game, onChange }: { game: GameState; onChange: (next: GameState) => void }) {
  const ledger = useMemo(() => walk(game), [game]);
  const now = useNow();
  const timed = game.settings.dayTimerSec > 0;
  const total = game.settings.dayTimerSec + (game.dayBonusSec ?? 0);
  const started = game.dayStartedAt ? Date.parse(game.dayStartedAt) : now;
  const elapsed = Math.max(0, Math.floor((now - started) / 1000));
  const left = Math.max(0, total - elapsed);
  const rule = voteRuleOf(game.settings);
  const urgent = timed && left > 0 && left <= 10;
  const over = timed && left === 0;

  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (!timed || lastTick.current === left) return;
    lastTick.current = left;
    if (left === 0) sfx.bell();
    else if (left <= 10) sfx.tick();
  }, [left, timed]);

  const r = 88;
  const c = 2 * Math.PI * r;
  const alive = ledger.alive.size;

  return (
    <div className="flex min-h-[78dvh] flex-col gap-5">
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-gold-brand">Day {ledger.days + 1}</p>
        <h1 className="text-3xl font-black text-white">The town talks</h1>
        <p className="text-sm text-muted">Accuse, defend, lie. Dead players stay silent.</p>
      </div>

      <div className={cn("relative mx-auto h-56 w-56", urgent && "heartbeat")}>
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          {timed ? (
            <circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke={over || urgent ? "#FF4D5A" : "#F5B942"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - left / total)}
              className="transition-[stroke-dashoffset,stroke] duration-500 ease-linear"
            />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Timer className={cn("h-5 w-5", over ? "text-red-danger" : "text-muted")} />
          <span className={cn("text-5xl font-black tabular-nums", over || urgent ? "text-red-danger" : "text-white")}>
            {timed ? fmt(left) : fmt(elapsed)}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {over ? "Time's up" : timed ? "left to talk" : "talking"}
          </span>
        </div>
      </div>

      {timed ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              sfx.tap();
              onChange(extendDay(game));
            }}
            className="h-9 rounded-full border border-border px-4 text-xs font-bold text-cream"
          >
            +1 minute
          </button>
        </div>
      ) : null}

      <Roster game={game} />

      <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
        <Users className="h-3.5 w-3.5" />
        {alive} alive ·{" "}
        {rule === "most" ? (
          <span>
            <span className="font-bold text-cream">most hands</span> goes, a tie spares everyone
          </span>
        ) : (
          <span>
            <span className="font-bold text-cream">{majorityOf(alive)} votes</span> to eliminate
          </span>
        )}
      </p>

      <Button
        size="lg"
        className={cn(
          "mt-auto h-14 w-full text-base",
          over ? "bg-red-brand text-white shadow-red-glow hover:bg-red-brand/90" : "",
        )}
        variant={over ? "default" : "secondary"}
        onClick={() => {
          sfx.step();
          onChange(openVote(game));
        }}
      >
        <Gavel className="h-5 w-5" />
        Take the vote
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------- vote */

export function VotePhase({
  game,
  onChange,
  onCommit,
}: {
  game: GameState;
  onChange: (next: GameState) => void;
  onCommit: (tallies: Tally[]) => void;
}) {
  const ledger = useMemo(() => walk(game), [game]);
  const alive = aliveSeats(game, ledger);
  const aliveCount = alive.length;
  const rule = voteRuleOf(game.settings);
  const majority = majorityOf(aliveCount);

  const [noms, setNoms] = useState<Tally[]>([]);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const used = noms.reduce((sum, n) => sum + n.hands, 0);
  const best = Math.max(0, ...noms.map((n) => n.hands));
  const leaders = noms.filter((n) => n.hands === best && best > 0);
  const tied = leaders.length > 1;
  const out = voteOutcome(noms, aliveCount, rule);
  const outSeat = out ? alive.find((s) => s.seatId === out)! : null;
  const nameOf = (id: string) => alive.find((s) => s.seatId === id)?.name ?? "?";

  const toggle = (seat: Seat) => {
    sfx.tap();
    setNoms((current) =>
      current.some((n) => n.seatId === seat.seatId)
        ? current.filter((n) => n.seatId !== seat.seatId)
        : [...current, { seatId: seat.seatId, hands: 0 }],
    );
  };

  const bump = (seatId: string, delta: 1 | -1) => {
    setNoms((current) =>
      current.map((n) => {
        if (n.seatId !== seatId) return n;
        if (delta > 0 && used >= aliveCount) return n;
        return { ...n, hands: Math.max(0, n.hands + delta) };
      }),
    );
    sfx.tap();
  };

  // Why nobody goes, in the room's own terms.
  const nobodyReason =
    noms.length === 0 || best === 0
      ? "Nobody raised a hand."
      : tied
        ? `${leaders.map((l) => nameOf(l.seatId)).join(" and ")} are tied on ${best}.`
        : `Nobody reached ${majority} of ${aliveCount}.`;

  const lockIn = () =>
    setConfirm(
      outSeat
        ? {
            title: `Vote ${outSeat.name} out?`,
            body: (
              <>
                <span className="font-bold text-white">{outSeat.name}</span> leaves the game with {best} hand
                {best === 1 ? "" : "s"}.{" "}
                {game.settings.revealOnDeath ? "Their role gets revealed." : "Their role stays secret until the end."}
              </>
            ),
            confirmLabel: `Vote ${outSeat.name} out`,
            onConfirm: () => onCommit(noms),
          }
        : {
            title: "Nobody goes?",
            tone: "neutral",
            body: (
              <>
                {nobodyReason} {tied ? "You could go back and re-vote between them. " : ""}Lock it in and the town
                sleeps with the mafia still among them.
              </>
            ),
            confirmLabel: "Nobody goes",
            onConfirm: () => onCommit(noms),
          },
    );

  return (
    <div className="flex min-h-[78dvh] flex-col gap-4">
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-red-danger">Day {ledger.days + 1} · the vote</p>
        <h1 className="text-3xl font-black text-white">Who does the town accuse?</h1>
        <p className="text-sm text-muted">
          Tap the accused, then count the hands.{" "}
          {rule === "most" ? (
            <>
              <span className="font-bold text-cream">Most hands goes</span> — a tie at the top spares everyone.
            </>
          ) : (
            <>
              <span className="font-bold text-cream">
                {majority} of {aliveCount}
              </span>{" "}
              is a majority.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {alive.map((seat) => {
          const on = noms.some((n) => n.seatId === seat.seatId);
          return (
            <button
              key={seat.seatId}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(seat)}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-full border pl-1 pr-3 text-sm font-bold transition active:scale-95",
                on ? "border-red-brand bg-red-brand/20 text-white" : "border-border bg-elevated text-cream",
              )}
            >
              <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" className="h-8 w-8" />
              {seat.name}
            </button>
          );
        })}
      </div>

      {noms.length > 0 ? (
        <div className="space-y-2">
          {noms.map((n) => {
            const seat = alive.find((s) => s.seatId === n.seatId)!;
            const going = out === n.seatId;
            const tiedTop = tied && n.hands === best;
            return (
              <div
                key={n.seatId}
                className={cn(
                  "chip-pop rounded-2xl border p-3 transition-colors",
                  going
                    ? "border-red-brand bg-red-brand/15 shadow-red-glow"
                    : tiedTop
                      ? "border-warning/60 bg-warning/10"
                      : "border-border bg-elevated",
                )}
              >
                <div className="flex items-center gap-3">
                  <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">{seat.name}</p>
                    {going ? (
                      <p className="chip-pop text-[10px] font-black uppercase tracking-widest text-red-danger">
                        {rule === "most" ? "Most hands" : "Majority"}
                      </p>
                    ) : tiedTop ? (
                      <p className="chip-pop text-[10px] font-black uppercase tracking-widest text-warning">Tied</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`One less hand for ${seat.name}`}
                    disabled={n.hands === 0}
                    onClick={() => bump(n.seatId, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span key={n.hands} className="chip-pop w-9 text-center text-3xl font-black tabular-nums text-white">
                    {n.hands}
                  </span>
                  <button
                    type="button"
                    aria-label={`One more hand for ${seat.name}`}
                    disabled={used >= aliveCount}
                    onClick={() => bump(n.seatId, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      going ? "bg-red-danger" : tiedTop ? "bg-warning" : "bg-gold-brand",
                    )}
                    style={{ width: `${(n.hands / aliveCount) * 100}%` }}
                  />
                  {rule === "majority" ? (
                    <div
                      className="absolute inset-y-0 w-0.5 bg-cream"
                      style={{ left: `${(majority / aliveCount) * 100}%` }}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
          <p className="flex items-center justify-center gap-1 text-xs text-muted">
            <Hand className="h-3.5 w-3.5" />
            {aliveCount - used} hand{aliveCount - used === 1 ? "" : "s"} not counted yet
          </p>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
          Nobody accused yet. Tap a name above.
        </p>
      )}

      <div className="mt-auto space-y-2">
        <Button
          size="lg"
          variant={outSeat ? "destructive" : "secondary"}
          className="h-14 w-full text-base"
          disabled={noms.length === 0}
          onClick={lockIn}
        >
          <Gavel className="h-5 w-5" />
          {outSeat
            ? `Lock it in — ${outSeat.name} goes`
            : tied
              ? "Lock it in — tied, nobody goes"
              : "Lock it in — nobody goes"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => onChange(backToDay(game))}>
            <ArrowLeft className="h-4 w-4" />
            More talking
          </Button>
          <Button
            variant="ghost"
            className="text-muted"
            onClick={() =>
              setConfirm({
                title: "Spare everyone today?",
                tone: "neutral",
                body: "No vote, nobody goes. Night falls with the mafia still at the table.",
                confirmLabel: "Spare everyone",
                onConfirm: () => onCommit([]),
              })
            }
          >
            Spare everyone
          </Button>
        </div>
      </div>

      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------- verdict */

export function VerdictPhase({
  game,
  onNight,
  onFinish,
}: {
  game: GameState;
  onNight: () => void;
  onFinish: () => void;
}) {
  const ledger = useMemo(() => walk(game), [game]);
  const entry = lastEntry(game, ledger);
  const outId = entry?.kind === "day" ? entry.out : entry?.kind === "left" ? entry.seatId : null;
  const seat = outId ? game.seats.find((s) => s.seatId === outId)! : null;
  const role = seat ? game.roles[seat.seatId] : null;
  const reveal = game.settings.revealOnDeath || ledger.winner !== null;
  const seed = `${game.gameId}:d${ledger.days}:${outId ?? "none"}`;

  const shown = useSuspense(entry?.kind === "left" ? 400 : SUSPENSE_MS, () => {
    if (!seat) sfx.spared();
    else if (!reveal) sfx.spared();
    else if (role === "mafia") sfx.guilty();
    else sfx.innocent();
  });

  return (
    <div className="flex min-h-[78dvh] flex-col items-center justify-center gap-6 text-center">
      {!shown ? (
        <div className="space-y-3">
          {seat ? (
            <PlayerAvatar
              name={seat.name}
              colorKey={seat.colorKey}
              size="lg"
              className="mx-auto h-24 w-24 animate-pulse text-2xl"
            />
          ) : (
            <Gavel className="mx-auto h-16 w-16 animate-pulse text-muted" />
          )}
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">The town has spoken…</p>
        </div>
      ) : seat && role ? (
        <div className="w-full space-y-5">
          <div className="relative mx-auto w-fit">
            <PlayerAvatar
              name={seat.name}
              colorKey={seat.colorKey}
              size="lg"
              className="h-24 w-24 text-2xl grayscale"
            />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <Stamp tone="cream">{entry?.kind === "left" ? "Left" : "Voted out"}</Stamp>
            </div>
          </div>

          {reveal ? (
            <div
              className={cn(
                "card-flip mx-auto flex w-64 flex-col items-center gap-1 rounded-[24px] border-2 bg-gradient-to-br p-5",
                ROLES[role].ring,
                ROLES[role].glow,
                ROLES[role].card,
              )}
            >
              <span className="text-5xl">{ROLES[role].emoji}</span>
              <p className="text-sm text-cream/70">{seat.name} was</p>
              <p className={cn("text-3xl font-black uppercase", ROLES[role].text)}>
                {role === "mafia" ? "Mafia" : `the ${ROLES[role].label}`}
              </p>
            </div>
          ) : (
            <h1 className="text-3xl font-black text-white">{seat.name} takes their secret with them</h1>
          )}

          {reveal && entry?.kind === "day" ? (
            <SayLine className="text-left">{role === "mafia" ? lines.guilty(seed) : lines.innocent(seed)}</SayLine>
          ) : null}

          <WinnerOrNext
            winner={ledger.winner !== null}
            onFinish={onFinish}
            next={{
              label: `Night ${ledger.nights + 1} falls`,
              icon: Moon,
              onClick: onNight,
              className: "bg-[#1b1d3a] text-cream hover:bg-[#23264a]",
            }}
          />
        </div>
      ) : (
        <div className="w-full space-y-5">
          <p className="chip-pop text-6xl">🤝</p>
          <h1 className="text-3xl font-black text-white">Nobody goes</h1>
          <SayLine className="text-left">{lines.spared(seed)}</SayLine>
          <WinnerOrNext
            winner={ledger.winner !== null}
            onFinish={onFinish}
            next={{
              label: `Night ${ledger.nights + 1} falls`,
              icon: Moon,
              onClick: onNight,
              className: "bg-[#1b1d3a] text-cream hover:bg-[#23264a]",
            }}
          />
        </div>
      )}
    </div>
  );
}
