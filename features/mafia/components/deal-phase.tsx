"use client";

import { ArrowRight, Eye, Moon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { confirmRole, currentDealee, partnersOf, type GameState, type Role, type Seat } from "@/features/mafia/engine";
import { RoleCard, useHold } from "@/features/mafia/components/role-card";
import { ROLES } from "@/features/mafia/script";
import { sfx } from "@/features/mafia/sounds";
import { cn } from "@/lib/utils";

/**
 * "Pass to Priya" → "I'm Priya" → press and hold the card → "Got it, pass it on".
 * The handoff screen shows nothing secret, so it's safe for anyone to see.
 */
export function HandoffScreen({
  seat,
  kicker,
  hint,
  cta,
  onConfirm,
}: {
  seat: Seat;
  kicker: string;
  hint: string;
  cta: string;
  onConfirm: () => void;
}) {
  return (
    <div
      key={seat.seatId}
      className="slide-in flex min-h-[72dvh] flex-col items-center justify-center gap-6 text-center"
    >
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">{kicker}</p>
        <div className="relative mx-auto w-fit">
          <div className="absolute inset-0 -z-10 rounded-full bg-red-brand/30 blur-2xl" />
          <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="lg" className="h-24 w-24 text-2xl" />
        </div>
        <h1 className="text-5xl font-black text-white">{seat.name}</h1>
        <p className="text-sm text-muted">{hint}</p>
      </div>
      <Button
        size="lg"
        className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow hover:bg-red-brand/90"
        onClick={onConfirm}
      >
        {cta}
      </Button>
    </div>
  );
}

/** The holder presses to look; "Done" only appears once they have. */
export function RevealScreen({
  seat,
  role,
  partners,
  doneLabel,
  onDone,
}: {
  seat: Seat;
  role: Role;
  partners: Seat[];
  doneLabel: string;
  onDone: () => void;
}) {
  const { held, seen, bind } = useHold(() => sfx.flip());

  return (
    <div className="fade-up flex min-h-[72dvh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-danger">Only {seat.name} looks</p>
        <p className="text-sm text-muted">
          {held ? "Let go to hide it." : "Press and hold the card. Let go to hide it."}
        </p>
      </div>
      <RoleCard name={seat.name} role={role} partners={partners} revealed={held} bind={bind} />
      <div
        className={cn(
          "w-full transition-opacity duration-300",
          seen && !held ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Button size="lg" variant="secondary" className="h-14 w-full text-base" onClick={onDone}>
          {doneLabel}
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export function DealPhase({ game, onChange }: { game: GameState; onChange: (next: GameState) => void }) {
  const dealee = currentDealee(game);
  const [ready, setReady] = useState<string | null>(null);

  if (!dealee) return null;

  const last = game.dealIndex === game.seats.length - 1;

  if (ready !== dealee.seatId) {
    return (
      <HandoffScreen
        seat={dealee}
        kicker={`Role ${game.dealIndex + 1} of ${game.seats.length} · pass the phone to`}
        hint="Everyone else — look away."
        cta={`I'm ${dealee.name}`}
        onConfirm={() => {
          sfx.tap();
          setReady(dealee.seatId);
        }}
      />
    );
  }

  return (
    <RevealScreen
      key={dealee.seatId}
      seat={dealee}
      role={game.roles[dealee.seatId]}
      partners={partnersOf(game, dealee.seatId)}
      doneLabel={last ? "Got it — give it to God" : "Got it — pass it on"}
      onDone={() => {
        sfx.pass();
        setReady(null);
        onChange(confirmRole(game));
      }}
    />
  );
}

/** Back to God: first make sure it's really God holding it, then the briefing. */
export function HandbackPhase({ game, onNightFalls }: { game: GameState; onNightFalls: () => void }) {
  const [isGod, setIsGod] = useState(false);

  if (!isGod) {
    return (
      <HandoffScreen
        seat={game.god}
        kicker="Everyone has a role · hand the phone to God"
        hint="God runs the night. Nobody else touches the phone now."
        cta={`I'm God (${game.god.name})`}
        onConfirm={() => {
          sfx.tap();
          setIsGod(true);
        }}
      />
    );
  }

  const counts = (["mafia", "doctor", "detective", "villager"] as Role[])
    .map((role) => ({ role, n: game.seats.filter((s) => game.roles[s.seatId] === role).length }))
    .filter((c) => c.n > 0);

  return (
    <div className="fade-up flex min-h-[72dvh] flex-col justify-center gap-6">
      <div className="space-y-1 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-danger">God&apos;s briefing</p>
        <h1 className="text-3xl font-black text-white">Tonight&apos;s town</h1>
        <p className="text-sm text-muted">{game.seats.length} players. You know everything — keep a straight face.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {counts.map(({ role, n }, i) => (
          <div
            key={role}
            style={{ animationDelay: `${i * 80}ms` }}
            className={cn("fade-up flex items-center gap-3 rounded-2xl border bg-black/40 p-3", ROLES[role].ring)}
          >
            <span className="text-3xl">{ROLES[role].emoji}</span>
            <div>
              <p className={cn("text-2xl font-black tabular-nums", ROLES[role].text)}>{n}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{ROLES[role].label}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Eye className="h-3.5 w-3.5" />
        Tap <span className="font-bold text-cream">Roles</span> at the top any time to see who&apos;s who.
      </p>

      <Button
        size="lg"
        className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow hover:bg-red-brand/90"
        onClick={onNightFalls}
      >
        <Moon className="h-5 w-5" />
        Night falls
      </Button>
    </div>
  );
}
