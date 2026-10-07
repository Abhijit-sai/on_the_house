"use client";

import {
  ArrowLeft,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Search,
  Shield,
  Sunrise,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  nightSteps,
  seatName,
  targetsFor,
  updateDraft,
  walk,
  type GameState,
  type NightRole,
  type NightStep,
} from "@/features/mafia/engine";
import { ConfirmSheet, type Confirm } from "@/features/mafia/components/confirm-sheet";
import { SayLine } from "@/features/mafia/components/role-card";
import { secureRng } from "@/features/mafia/local-game";
import { NIGHT_LINES, ROLES, SLEEP_LINE, WAKE_LINE } from "@/features/mafia/script";
import { sfx } from "@/features/mafia/sounds";
import { cn } from "@/lib/utils";

/** Stars and a moon behind every night screen. Fixed positions so they don't jump between steps. */
const STARS = [
  [8, 12, 0],
  [22, 6, 1.1],
  [37, 18, 2.3],
  [55, 8, 0.6],
  [71, 15, 1.7],
  [86, 7, 2.9],
  [93, 22, 0.3],
  [14, 30, 2.1],
  [64, 28, 1.3],
  [44, 34, 2.7],
] as const;

export function NightSky({ big = false }: { big?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#030308]">
      <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-[#0b1030] via-[#06081a] to-transparent" />
      {STARS.map(([x, y, d], i) => (
        <span
          key={i}
          className="twinkle absolute h-0.5 w-0.5 rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
        />
      ))}
      <div
        className={cn(
          "moon-rise absolute right-8 top-16 rounded-full bg-[#f4efd9] shadow-[0_0_60px_18px_rgba(244,239,217,0.18)]",
          big ? "h-24 w-24" : "h-12 w-12 opacity-70",
        )}
      >
        <span className="absolute left-3 top-4 h-3 w-3 rounded-full bg-black/10" />
        <span className="absolute bottom-4 right-5 h-4 w-4 rounded-full bg-black/10" />
      </div>
      <div className="mafia-fog absolute -bottom-10 -left-20 h-48 w-[140%] rounded-full bg-slate-400/10 blur-3xl" />
    </div>
  );
}

type Script = ({ kind: "sleep" } | { kind: "role"; step: NightStep } | { kind: "wake" })[];

export function NightPhase({
  game,
  onChange,
  onDawn,
}: {
  game: GameState;
  onChange: (next: GameState) => void;
  onDawn: () => void;
}) {
  const ledger = useMemo(() => walk(game), [game]);
  const script: Script = useMemo(
    () => [
      { kind: "sleep" },
      ...nightSteps(game, ledger).map((step) => ({ kind: "role" as const, step })),
      { kind: "wake" },
    ],
    [game, ledger],
  );

  const draft = game.draft;
  const nightStarted = useRef(false);

  // The owl and the wind, once, as the night opens.
  useEffect(() => {
    if (draft?.step === 0 && !nightStarted.current) {
      nightStarted.current = true;
      sfx.nightFall();
    }
  }, [draft?.step]);

  if (!draft) return null;

  const at = Math.min(draft.step, script.length - 1);
  const current = script[at];
  const go = (step: number) => {
    sfx.step();
    onChange(updateDraft(game, { step }));
  };

  return (
    <div className="relative flex min-h-[78dvh] flex-col">
      {/* progress: one dot per spoken step */}
      <div className="mb-4 flex items-center justify-center gap-1.5">
        {script.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === at ? "w-6 bg-cream" : i < at ? "w-1.5 bg-cream/60" : "w-1.5 bg-white/15",
            )}
          />
        ))}
      </div>

      <div key={at} className="slide-in flex flex-1 flex-col">
        {current.kind === "sleep" ? (
          <SleepStep night={draft.night} onNext={() => go(at + 1)} />
        ) : current.kind === "role" ? (
          <RoleStep
            game={game}
            step={current.step}
            picked={draft[current.step.role]}
            onPick={(seatId) => onChange(updateDraft(game, { [current.step.role]: seatId }))}
            onBack={() => go(at - 1)}
            onNext={() => go(at + 1)}
          />
        ) : (
          <WakeStep game={game} onBack={() => go(at - 1)} onDawn={onDawn} />
        )}
      </div>
    </div>
  );
}

function SleepStep({ night, onNext }: { night: number; onNext: () => void }) {
  return (
    <div className="flex flex-1 flex-col justify-end gap-5 pb-2">
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-200/70">Night {night}</p>
        <h1 className="text-4xl font-black text-white">The town sleeps</h1>
      </div>
      <SayLine>{SLEEP_LINE}</SayLine>
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <EyeOff className="h-3.5 w-3.5" />
        Wait until every eye is shut. Keep the phone low — the screen stays dark.
      </p>
      <Button size="lg" variant="secondary" className="h-14 w-full text-base" onClick={onNext}>
        Every eye is closed
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

const PICK_ICON: Record<NightRole, typeof Crosshair> = { mafia: Crosshair, doctor: Shield, detective: Search };
const PICK_STYLE: Record<NightRole, string> = {
  mafia: "border-red-brand bg-red-brand/20 text-red-100",
  doctor: "border-emerald-400 bg-emerald-500/15 text-emerald-100",
  detective: "border-gold-brand bg-gold-brand/15 text-gold-brand",
};

function RoleStep({
  game,
  step,
  picked,
  onPick,
  onBack,
  onNext,
}: {
  game: GameState;
  step: NightStep;
  picked: string | null;
  onPick: (seatId: string | null) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const meta = ROLES[step.role];
  const lines = NIGHT_LINES[step.role];
  const Icon = PICK_ICON[step.role];
  // "Nobody" is a real answer, distinct from "hasn't chosen yet".
  const [decided, setDecided] = useState(picked !== null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  const choose = (seatId: string | null) => {
    sfx.tap();
    setDecided(true);
    onPick(seatId);
  };

  // The family can turn on one of its own — allowed, but God double-checks it's not a mis-point.
  const pick = (seatId: string | null) => {
    if (step.role === "mafia" && seatId && game.roles[seatId] === "mafia") {
      const name = seatName(game, seatId);
      setConfirm({
        title: `Kill ${name}?`,
        tone: "caution",
        body: (
          <>
            <span className="font-bold text-white">{name} is one of the family.</span> The mafia can take out their own
            — a bold bluff — but make sure they really pointed at {name}.
          </>
        ),
        confirmLabel: `Yes, ${name}`,
        onConfirm: () => choose(seatId),
      });
      return;
    }
    choose(seatId);
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "eye-open flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-black/50 text-3xl",
            meta.ring,
          )}
        >
          {meta.emoji}
        </div>
        <div className="min-w-0">
          <p className={cn("text-2xl font-black", meta.text)}>{meta.label}</p>
          <p className="truncate text-xs text-muted">
            {step.pretend ? (
              <span className="text-cream/70">No one&apos;s left to wake — pretend anyway</span>
            ) : (
              <>
                <Eye className="mb-0.5 mr-1 inline h-3 w-3" />
                Awake: {step.holders.map((h) => h.name).join(", ")}
              </>
            )}
          </p>
        </div>
      </div>

      <SayLine>
        {lines.open} {lines.ask}
      </SayLine>

      {step.pretend ? (
        <PretendWait key={step.role} onDone={() => setDecided(true)} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {targetsFor(game, step.role).map(({ seat, disabled, note }) => {
              const selected = picked === seat.seatId;
              return (
                <button
                  key={seat.seatId}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(selected ? null : seat.seatId)}
                  className={cn(
                    "relative flex min-h-14 items-center gap-2 rounded-2xl border px-2.5 text-left transition active:scale-[0.97] disabled:opacity-30",
                    selected ? PICK_STYLE[step.role] : "border-white/10 bg-white/[0.03] text-cream",
                  )}
                >
                  <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">{seat.name}</span>
                    {note ? <span className="block truncate text-[10px] text-muted">{note}</span> : null}
                  </span>
                  {selected ? <Icon className="lock-on h-5 w-5 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => pick(null)}
            className={cn(
              "h-10 rounded-full border text-xs font-bold",
              decided && picked === null ? "border-cream/50 bg-white/10 text-cream" : "border-white/10 text-muted",
            )}
          >
            {step.role === "mafia" ? "They couldn't agree — no kill" : "They didn't choose anyone"}
          </button>

          {step.role === "detective" && picked ? <DetectiveAnswer key={picked} game={game} seatId={picked} /> : null}
        </>
      )}

      <div className="mt-auto space-y-3 pt-2">
        {decided ? <SayLine className="fade-up">{lines.close}</SayLine> : null}
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" className="h-14 shrink-0 px-4" aria-label="Back a step" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button size="lg" variant="secondary" disabled={!decided} className="h-14 flex-1 text-base" onClick={onNext}>
            {lines.done}
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

/** God gives this as a silent gesture — the phone makes no sound for it. */
function DetectiveAnswer({ game, seatId }: { game: GameState; seatId: string }) {
  const mafia = game.roles[seatId] === "mafia";
  return (
    <div
      className={cn(
        "chip-pop flex items-center gap-4 rounded-2xl border p-4",
        mafia ? "border-red-brand/60 bg-red-brand/15" : "border-white/15 bg-white/[0.04]",
      )}
    >
      {mafia ? (
        <ThumbsUp className="h-12 w-12 shrink-0 text-red-danger" />
      ) : (
        <ThumbsDown className="h-12 w-12 shrink-0 text-cream/70" />
      )}
      <div>
        <p className={cn("text-xl font-black", mafia ? "text-red-danger" : "text-cream")}>
          {seatName(game, seatId)} {mafia ? "IS mafia" : "is not mafia"}
        </p>
        <p className="text-xs text-muted">Show a silent thumbs {mafia ? "up" : "down"} to the detective.</p>
      </div>
    </div>
  );
}

/**
 * A dead role still gets called, with a believable pause — rushing it would
 * tell the table nobody's there. The wait is random each time.
 */
function PretendWait({ onDone }: { onDone: () => void }) {
  const [total] = useState(() => 6 + Math.floor(secureRng() * 5));
  const [left, setLeft] = useState(total);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (left <= 0) {
      done.current();
      return;
    }
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  const r = 34;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="rgba(255,244,214,0.7)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (left / total)}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black tabular-nums text-cream">
          {Math.max(left, 0)}
        </span>
      </div>
      <p className="text-sm text-muted">Pause as if they&apos;re choosing. Don&apos;t rush — the town is listening.</p>
    </div>
  );
}

function WakeStep({ game, onBack, onDawn }: { game: GameState; onBack: () => void; onDawn: () => void }) {
  const draft = game.draft!;
  const rows = [
    { role: "mafia" as const, on: true, label: "Mafia hit", value: draft.mafia },
    { role: "doctor" as const, on: game.settings.doctor, label: "Doctor saved", value: draft.doctor },
    { role: "detective" as const, on: game.settings.detective, label: "Detective checked", value: draft.detective },
  ].filter((r) => r.on);

  const saved = draft.mafia !== null && draft.mafia === draft.doctor;
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const outcome =
    draft.mafia === null
      ? "Nobody dies tonight."
      : saved
        ? `${seatName(game, draft.mafia)} survives — the doctor got there first.`
        : `${seatName(game, draft.mafia)} won't wake up.`;

  const lockNight = () =>
    setConfirm({
      title: "Lock in the night?",
      tone: draft.mafia && !saved ? "danger" : "neutral",
      body: (
        <>
          <span className="font-bold text-white">{outcome}</span> Once dawn breaks the town hears it — you can still
          undo it from the menu if you mis-tapped.
        </>
      ),
      confirmLabel: "Dawn breaks",
      onConfirm: onDawn,
    });

  return (
    <div className="flex flex-1 flex-col justify-end gap-4">
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-indigo-200/70">
          Night {draft.night} · only you see this
        </p>
        <h1 className="text-3xl font-black text-white">The night&apos;s work</h1>
      </div>

      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {rows.map((r) => (
          <div key={r.role} className="flex items-center gap-3 px-4 py-3">
            <span className="text-xl">{ROLES[r.role].emoji}</span>
            <span className="flex-1 text-sm text-muted">{r.label}</span>
            <span className="text-sm font-black text-cream">{r.value ? seatName(game, r.value) : "—"}</span>
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-cream/80">{outcome}</p>

      <SayLine>{WAKE_LINE}</SayLine>

      <div className="flex gap-2">
        <Button variant="ghost" size="lg" className="h-14 shrink-0 px-4" aria-label="Back a step" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button
          size="lg"
          className="h-14 flex-1 bg-gold-brand text-base text-background hover:bg-gold-brand/90"
          onClick={lockNight}
        >
          <Sunrise className="h-5 w-5" />
          Dawn breaks
        </Button>
      </div>

      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
