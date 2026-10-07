"use client";

import { Drama, Eye, LogOut, MoreHorizontal, RotateCcw, Skull, Undo2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  beginNight,
  commitNight,
  commitVote,
  finishGame,
  partnersOf,
  recordPeek,
  removePlayer,
  startDay,
  undoLast,
  walk,
  withUndo,
  type GameState,
  type Role,
  type Seat,
  type Tally,
} from "@/features/mafia/engine";
import { DealPhase, HandbackPhase, HandoffScreen, RevealScreen } from "@/features/mafia/components/deal-phase";
import { DawnPhase, DawnSky, DayPhase, VerdictPhase, VotePhase } from "@/features/mafia/components/day-phases";
import { NightPhase, NightSky } from "@/features/mafia/components/night-phase";
import { ConfirmSheet, type Confirm } from "@/features/mafia/components/confirm-sheet";
import { RoleBadge, useHold } from "@/features/mafia/components/role-card";
import { StoryPhase } from "@/features/mafia/components/story-phase";
import { ROLES } from "@/features/mafia/script";
import { isMuted, setMuted, sfx } from "@/features/mafia/sounds";
import { cn } from "@/lib/utils";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

type Peek = { seat: Seat; stage: "handoff" | "reveal" } | null;

const ROLE_ORDER: Role[] = ["mafia", "doctor", "detective", "villager"];

export function GameTable({
  game,
  roomTitle,
  onChange,
  onAbandon,
  onDone,
  save,
}: {
  game: GameState;
  roomTitle: string;
  onChange: (next: GameState) => void;
  onAbandon: () => void;
  onDone: () => void;
  save: SaveState & { retry: () => void };
}) {
  const [muted, setMutedState] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [peekPicker, setPeekPicker] = useState(false);
  const [leavePicker, setLeavePicker] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [peek, setPeek] = useState<Peek>(null);
  const [leftNotice, setLeftNotice] = useState<Seat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  useEffect(() => setMutedState(isMuted()), []);

  const ledger = useMemo(() => walk(game), [game]);

  /** Every move goes through here: engine errors become a banner instead of a crash. */
  function apply(make: () => GameState, mode: "undoable" | "clear" | "keep" = "clear") {
    try {
      const next = make();
      setError(null);
      if (mode === "undoable") onChange(withUndo(game, next));
      else if (mode === "keep") onChange({ ...next, undo: game.undo ?? null });
      else onChange({ ...next, undo: null });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That move isn't allowed.");
      return false;
    }
  }

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  const phase = game.phase;
  const godMode = phase !== "deal" && phase !== "over";
  const atNight = phase === "night";
  const canPeek = ["handback", "dawn", "day", "vote", "verdict"].includes(phase);
  const canLeave = ["dawn", "day", "vote"].includes(phase);
  const canUndo = Boolean(game.undo) && ["dawn", "day", "vote", "verdict"].includes(phase);

  const title =
    phase === "deal"
      ? "The deal"
      : phase === "handback"
        ? "Over to God"
        : phase === "night"
          ? `Night ${game.draft?.night ?? ledger.nights + 1}`
          : phase === "dawn"
            ? `Morning ${ledger.nights}`
            : phase === "over"
              ? "Game over"
              : phase === "verdict"
                ? `Day ${ledger.days}`
                : `Day ${ledger.days + 1}`;
  const subtitle =
    phase === "deal"
      ? `${game.dealIndex} of ${game.seats.length} have their role`
      : phase === "over"
        ? roomTitle
        : // the alive count would spoil the dawn and verdict reveals, so it waits until they're over
          phase === "dawn" || phase === "verdict"
          ? `God: ${game.god.name}`
          : `${ledger.alive.size} alive · God: ${game.god.name}`;

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 mx-auto flex max-w-md flex-col transition-colors duration-1000",
        atNight ? "bg-[#030308]" : "bg-background",
      )}
    >
      {/* noir haze by day, a full moonlit sky by night — so the table feels like its own world */}
      {atNight ? (
        <NightSky big={game.draft?.step === 0} />
      ) : phase === "dawn" ? (
        <DawnSky key={ledger.nights} />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-red-brand/20 blur-3xl" />
          <div className="mafia-fog absolute -bottom-16 -left-10 h-56 w-[130%] rounded-full bg-slate-300/[0.06] blur-3xl" />
        </div>
      )}

      <header
        className={cn(
          "relative z-10 flex items-center gap-2 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]",
          atNight ? "border-white/5 bg-transparent" : "border-border",
        )}
      >
        <Drama className={cn("h-5 w-5 shrink-0", atNight ? "text-indigo-300/60" : "text-red-danger")} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-xs font-bold uppercase tracking-[0.2em]",
              atNight ? "text-indigo-200/70" : "text-red-danger",
            )}
          >
            {title}
          </p>
          <p className="truncate text-xs text-muted">{subtitle}</p>
        </div>
        {godMode ? (
          <button
            type="button"
            onClick={() => setRolesOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-elevated px-3 text-xs font-bold text-cream"
          >
            <Eye className="h-4 w-4" />
            Roles
          </button>
        ) : null}
        {phase !== "over" ? (
          <button
            type="button"
            aria-label="God's menu"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-cream"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            aria-label={muted ? "Turn sound on" : "Mute"}
            onClick={toggleMute}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-cream"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        )}
      </header>

      <main className="relative flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {error ? (
          <p className="mb-3 rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">
            {error}
          </p>
        ) : null}

        {phase === "deal" ? <DealPhase game={game} onChange={(n) => apply(() => n)} /> : null}

        {phase === "handback" ? <HandbackPhase game={game} onNightFalls={() => apply(() => beginNight(game))} /> : null}

        {phase === "night" ? (
          <NightPhase
            game={game}
            onChange={(n) => apply(() => n)}
            onDawn={() => {
              if (apply(() => commitNight(game), "undoable")) sfx.dawn();
            }}
          />
        ) : null}

        {phase === "dawn" ? (
          <DawnPhase
            key={ledger.nights}
            game={game}
            onStartDay={() => {
              if (apply(() => startDay(game))) sfx.step();
            }}
            onFinish={() => finish()}
          />
        ) : null}

        {phase === "day" ? <DayPhase game={game} onChange={(n) => apply(() => n, "keep")} /> : null}

        {phase === "vote" ? (
          <VotePhase
            game={game}
            onChange={(n) => apply(() => n, "keep")}
            onCommit={(tallies: Tally[]) => {
              if (apply(() => commitVote(game, tallies), "undoable")) sfx.drumroll();
            }}
          />
        ) : null}

        {phase === "verdict" ? (
          <VerdictPhase
            key={ledger.story.length}
            game={game}
            onNight={() => apply(() => beginNight(game))}
            onFinish={() => finish()}
          />
        ) : null}

        {phase === "over" ? <StoryPhase game={game} save={save} onDone={onDone} /> : null}
      </main>

      {/* God's menu */}
      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="God's menu">
        <div className="grid gap-2">
          {canUndo ? (
            <MenuItem
              icon={Undo2}
              label={phase === "dawn" ? "Undo the night" : phase === "verdict" ? "Undo the vote" : "Undo last step"}
              hint="Made a wrong tap? Take it back."
              onClick={() => {
                setMenuOpen(false);
                setConfirm({
                  title: phase === "dawn" ? "Undo the night?" : phase === "verdict" ? "Undo the vote?" : "Undo that?",
                  tone: "neutral",
                  body:
                    phase === "dawn"
                      ? "Back to the end of the night with every pick still in place, so you can fix one."
                      : phase === "verdict"
                        ? "Back to the vote — the hands are cleared and nobody is out."
                        : "Takes back your last step.",
                  confirmLabel: "Undo",
                  onConfirm: () => apply(() => undoLast(game)),
                });
              }}
            />
          ) : null}
          {canPeek ? (
            <MenuItem
              icon={Eye}
              label="Show a player their role"
              hint="Plays an alert so the table knows."
              onClick={() => {
                setMenuOpen(false);
                setPeekPicker(true);
              }}
            />
          ) : null}
          {canLeave ? (
            <MenuItem
              icon={LogOut}
              label="Someone has to leave"
              hint="They're out of the game and their role is shown."
              onClick={() => {
                setMenuOpen(false);
                setLeavePicker(true);
              }}
            />
          ) : null}
          <MenuItem
            icon={muted ? VolumeX : Volume2}
            label={muted ? "Sound is off" : "Sound is on"}
            hint="Tap to toggle."
            onClick={toggleMute}
          />
          <MenuItem
            icon={X}
            label="Quit this game"
            hint="Nobody scores for it."
            danger
            onClick={() => {
              setMenuOpen(false);
              setConfirmQuit(true);
            }}
          />
        </div>
      </BottomSheet>

      <BottomSheet open={rolesOpen} onClose={() => setRolesOpen(false)} title="Who's who">
        <RolesSheet game={game} />
      </BottomSheet>

      <BottomSheet open={peekPicker} onClose={() => setPeekPicker(false)} title="Who needs to see their role?">
        <SeatGrid
          seats={game.seats}
          disabled={() => false}
          onPick={(seat) => {
            setPeekPicker(false);
            sfx.peek();
            setPeek({ seat, stage: "handoff" });
          }}
        />
      </BottomSheet>

      <BottomSheet open={leavePicker} onClose={() => setLeavePicker(false)} title="Who's leaving?">
        <p className="mb-3 text-sm text-muted">They&apos;re out for the rest of the game. It can still end the game.</p>
        <SeatGrid
          seats={game.seats}
          disabled={(s) => !ledger.alive.has(s.seatId)}
          onPick={(seat) => {
            setLeavePicker(false);
            setConfirm({
              title: `Take ${seat.name} out of the game?`,
              body: (
                <>
                  <span className="font-bold text-white">{seat.name}</span> is out for the rest of this game
                  {game.settings.revealOnDeath ? " and their role is shown" : ""}. If it tips the balance, the game ends
                  right here.
                </>
              ),
              confirmLabel: `Remove ${seat.name}`,
              onConfirm: () => {
                const ok = apply(() => removePlayer(game, seat.seatId), "undoable");
                if (ok && !walk({ ...game, events: [...game.events, { t: "left", seatId: seat.seatId }] }).winner) {
                  setLeftNotice(seat);
                }
              },
            });
          }}
        />
      </BottomSheet>

      <BottomSheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Quit this game?">
        <p className="mb-4 text-sm leading-6 text-muted">
          The roles are thrown away and nobody scores. The room and its scoreboard stay as they are.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setConfirmQuit(false)}>
            Keep playing
          </Button>
          <Button variant="destructive" onClick={onAbandon}>
            Quit game
          </Button>
        </div>
      </BottomSheet>

      <ConfirmSheet confirm={confirm} onClose={() => setConfirm(null)} />

      {/* someone re-reading their role: the whole screen flashes, then the same handoff as the deal */}
      {peek ? (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-background px-4">
          <div aria-hidden className="peek-alarm pointer-events-none fixed inset-0 mx-auto max-w-md" />
          {peek.stage === "handoff" ? (
            <HandoffScreen
              seat={peek.seat}
              kicker="Role check · hand the phone to"
              hint="Everyone else — look away."
              cta={`I'm ${peek.seat.name}`}
              onConfirm={() => setPeek({ ...peek, stage: "reveal" })}
            />
          ) : (
            <RevealScreen
              seat={peek.seat}
              role={game.roles[peek.seat.seatId]}
              partners={partnersOf(game, peek.seat.seatId)}
              doneLabel="Done — back to God"
              onDone={() => {
                apply(() => recordPeek(game, peek.seat.seatId), "keep");
                setPeek(null);
              }}
            />
          )}
          <Button
            variant="ghost"
            className="mb-[max(1rem,env(safe-area-inset-bottom))] text-muted"
            onClick={() => setPeek(null)}
          >
            Never mind
          </Button>
        </div>
      ) : null}

      {/* a player left mid-day — show it, then carry on */}
      {leftNotice ? (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col items-center justify-center gap-5 bg-black/95 px-6 text-center backdrop-blur">
          <PlayerAvatar
            name={leftNotice.name}
            colorKey={leftNotice.colorKey}
            size="lg"
            className="h-20 w-20 text-xl grayscale"
          />
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white">{leftNotice.name} left the game</h2>
            {game.settings.revealOnDeath ? (
              <div className="card-flip flex justify-center">
                <RoleBadge role={game.roles[leftNotice.seatId]} className="px-3 py-1 text-xs" />
              </div>
            ) : (
              <p className="text-sm text-muted">Their role stays secret until the end.</p>
            )}
          </div>
          <Button size="lg" variant="secondary" className="h-14 w-full text-base" onClick={() => setLeftNotice(null)}>
            Carry on
          </Button>
        </div>
      ) : null}
    </div>
  );

  function finish() {
    const winner = ledger.winner;
    if (apply(() => finishGame(game))) {
      if (winner === "mafia") sfx.mafiaWins();
      else sfx.townWins();
    }
  }
}

function MenuItem({
  icon: Icon,
  label,
  hint,
  danger,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  hint: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-elevated px-4 text-left transition active:scale-[0.99]"
    >
      <Icon className={cn("h-5 w-5 shrink-0", danger ? "text-red-danger" : "text-cream")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-bold", danger ? "text-red-danger" : "text-white")}>{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </button>
  );
}

function SeatGrid({
  seats,
  disabled,
  onPick,
}: {
  seats: Seat[];
  disabled: (seat: Seat) => boolean;
  onPick: (seat: Seat) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {seats.map((seat) => {
        const off = disabled(seat);
        return (
          <button
            key={seat.seatId}
            type="button"
            disabled={off}
            onClick={() => onPick(seat)}
            className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-elevated px-3 text-left text-sm font-bold text-cream disabled:opacity-35"
          >
            <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
            <span className="min-w-0 flex-1 truncate">{seat.name}</span>
            {off ? <Skull className="h-4 w-4 text-muted" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** God's cheat sheet. Hold to look, so a glance over the shoulder gets nothing. */
function RolesSheet({ game }: { game: GameState }) {
  const { held, bind } = useHold();
  const ledger = walk(game);

  return (
    <div className="space-y-3">
      <button
        type="button"
        {...bind}
        className={cn(
          "flex h-14 w-full touch-none select-none items-center justify-center gap-2 rounded-2xl border text-sm font-bold [-webkit-touch-callout:none]",
          held ? "border-red-brand bg-red-brand/15 text-white" : "border-border bg-elevated text-cream",
        )}
      >
        <Eye className="h-4 w-4" />
        {held ? "Let go to hide" : "Press & hold to see the roles"}
      </button>

      <div
        className={cn(
          "space-y-2 transition-all duration-200",
          held ? "opacity-100 blur-0" : "pointer-events-none select-none opacity-60 blur-md",
        )}
      >
        {ROLE_ORDER.map((role) => {
          const holders = game.seats.filter((s) => game.roles[s.seatId] === role);
          if (holders.length === 0) return null;
          return (
            <div key={role} className={cn("rounded-2xl border bg-black/30 p-3", ROLES[role].ring)}>
              <p className={cn("mb-2 text-xs font-black uppercase tracking-widest", ROLES[role].text)}>
                {ROLES[role].emoji} {ROLES[role].label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {holders.map((s) => {
                  const dead = !ledger.alive.has(s.seatId);
                  return (
                    <span
                      key={s.seatId}
                      className={cn(
                        "rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold",
                        dead ? "text-muted line-through" : "text-cream",
                      )}
                    >
                      {held ? s.name : "••••"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {ledger.checks.size > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <RotateCcw className="h-3 w-3" />
          The detective has checked {ledger.checks.size} player{ledger.checks.size === 1 ? "" : "s"} so far.
        </p>
      ) : null}
    </div>
  );
}
