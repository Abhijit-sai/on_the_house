"use client";

import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  RotateCcw,
  Skull,
  Trophy,
  VenetianMask,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Confetti } from "@/components/shared/confetti";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  aliveSeats,
  cardOf,
  claimCard,
  clueOrder,
  currentDrawer,
  dealComplete,
  finishGame,
  isAlive,
  lastElimination,
  nextClue,
  openVote,
  recordPeek,
  scoreGame,
  startRound,
  voteOut,
  type GameState,
  type Seat,
} from "@/features/imposter/engine";
import { secureRng } from "@/features/imposter/local-game";
import { isMuted, setMuted, sfx } from "@/features/imposter/sounds";
import { cn } from "@/lib/utils";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

type Overlay =
  | { kind: "draw"; cardIndex: number; seat: Seat }
  | { kind: "peek-ask"; seat: Seat }
  | { kind: "peek-show"; seat: Seat }
  | null;

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
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [muted, setMutedState] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [alarm, setAlarm] = useState(0);

  useEffect(() => setMutedState(isMuted()), []);

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  function askPeek(seat: Seat) {
    setCardsOpen(false);
    sfx.peek();
    setAlarm((n) => n + 1);
    setOverlay({ kind: "peek-ask", seat });
  }

  const phaseLabel = game.phase === "deal" ? "Dealing" : game.phase === "over" ? "Game over" : `Round ${game.round}`;
  const stageLabel =
    game.phase === "clues" ? "Clues" : game.phase === "vote" ? "Vote" : game.phase === "reveal" ? "Reveal" : roomTitle;

  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-background">
      {/* red pulse around the screen on every peek — keyed so each peek replays it */}
      {alarm > 0 ? (
        <div key={alarm} aria-hidden className="peek-alarm pointer-events-none fixed inset-0 z-[60] mx-auto max-w-md" />
      ) : null}
      {/* violet haze so the table feels like its own world */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-red-brand/15 blur-3xl" />
      </div>

      <header className="flex items-center gap-2 border-b border-border px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <VenetianMask className="h-5 w-5 shrink-0 text-violet-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-[0.2em] text-violet-300">{phaseLabel}</p>
          <p className="truncate text-xs text-muted">
            {stageLabel} · {game.categoryLabel}
          </p>
        </div>
        {game.phase !== "deal" && game.phase !== "over" ? (
          <button
            type="button"
            onClick={() => setCardsOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-elevated px-3 text-xs font-bold text-cream"
          >
            <Eye className="h-4 w-4" />
            Cards
          </button>
        ) : null}
        <button
          type="button"
          aria-label={muted ? "Turn sound on" : "Mute"}
          onClick={toggleMute}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-cream"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        {game.phase !== "over" ? (
          <button
            type="button"
            aria-label="Quit this game"
            onClick={() => setConfirmQuit(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-muted"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {game.phase === "deal" ? (
          <DealPhase game={game} onChange={onChange} onDraw={(cardIndex, seat) => setOverlay({ kind: "draw", cardIndex, seat })} onPeek={askPeek} />
        ) : null}
        {game.phase === "clues" ? <CluePhase game={game} onChange={onChange} /> : null}
        {game.phase === "vote" ? <VotePhase game={game} onChange={onChange} /> : null}
        {game.phase === "reveal" ? <RevealPhase game={game} onChange={onChange} /> : null}
        {game.phase === "over" ? <OverPhase game={game} save={save} onDone={onDone} /> : null}
      </main>

      {overlay ? (
        <WordOverlay
          overlay={overlay}
          game={game}
          onClose={() => setOverlay(null)}
          onConfirmDraw={() => {
            if (overlay.kind !== "draw") return;
            const next = claimCard(game, overlay.cardIndex);
            setOverlay(null);
            onChange(next);
            if (!dealComplete(next)) sfx.pass();
            else sfx.fanfare();
          }}
          onShowPeek={() => {
            if (overlay.kind !== "peek-ask") return;
            onChange(recordPeek(game, overlay.seat.seatId));
            sfx.reveal();
            setOverlay({ kind: "peek-show", seat: overlay.seat });
          }}
        />
      ) : null}

      <BottomSheet open={cardsOpen} onClose={() => setCardsOpen(false)} title="Need to see your card again?">
        <p className="mb-3 text-sm text-muted">Tap your name. Everyone will hear it.</p>
        <div className="grid grid-cols-2 gap-2">
          {game.seats.map((seat) => {
            const out = !isAlive(game, seat.seatId);
            return (
              <button
                key={seat.seatId}
                type="button"
                disabled={out}
                onClick={() => askPeek(seat)}
                className="flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-elevated px-3 text-left text-sm font-bold text-cream disabled:opacity-35"
              >
                <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                <span className="min-w-0 flex-1 truncate">{seat.name}</span>
                {out ? <Skull className="h-4 w-4 text-muted" /> : <Eye className="h-4 w-4 text-violet-300" />}
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <BottomSheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Quit this game?">
        <p className="mb-4 text-sm leading-6 text-muted">
          The deal is thrown away and nobody scores for it. The room and its scoreboard stay as they are.
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
    </div>
  );
}

/* ---------------------------------------------------------------- the deal */

function FaceDownCard({ index, onClick, disabled }: { index: number; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Card ${index + 1}`}
      style={{ animationDelay: `${index * 45}ms` }}
      className="card-deal group relative aspect-[3/4] overflow-hidden rounded-2xl border border-violet-400/40 bg-gradient-to-br from-violet-700 via-[#2a1147] to-red-deep shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition active:scale-95 disabled:opacity-60"
    >
      <div className="absolute inset-1.5 rounded-xl border border-white/15 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0_6px,transparent_6px_12px)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <VenetianMask className="h-8 w-8 text-white/80 transition group-hover:scale-110" />
        <span className="text-lg font-black text-white/70">?</span>
      </div>
    </button>
  );
}

function ClaimedCard({ seat, out, onPeek }: { seat: Seat; out: boolean; onPeek?: () => void }) {
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-elevated p-2 text-center",
        out && "opacity-40",
      )}
    >
      <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="md" />
      <span className="w-full truncate text-xs font-black text-cream">{seat.name}</span>
      {onPeek && !out ? (
        <button
          type="button"
          onClick={onPeek}
          className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200"
        >
          <Eye className="h-3 w-3" />
          See card
        </button>
      ) : out ? (
        <Skull className="h-4 w-4 text-muted" />
      ) : null}
    </div>
  );
}

function DealPhase({
  game,
  onChange,
  onDraw,
  onPeek,
}: {
  game: GameState;
  onChange: (next: GameState) => void;
  onDraw: (cardIndex: number, seat: Seat) => void;
  onPeek: (seat: Seat) => void;
}) {
  const drawer = currentDrawer(game);
  const done = dealComplete(game);
  const seatById = new Map(game.seats.map((s) => [s.seatId, s]));
  const cols = game.cards.length <= 4 ? "grid-cols-2" : game.cards.length <= 9 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="space-y-5">
      {drawer ? (
        <div key={drawer.seatId} className="chip-pop space-y-1 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
            Card {game.dealIndex + 1} of {game.cards.length} · pass the phone to
          </p>
          <div className="flex items-center justify-center gap-3">
            <PlayerAvatar name={drawer.name} colorKey={drawer.colorKey} size="lg" />
            <h1 className="text-4xl font-black text-white">{drawer.name}</h1>
          </div>
          <p className="text-sm text-muted">Pick any card. Only you look.</p>
        </div>
      ) : (
        <div className="chip-pop space-y-1 text-center">
          <p className="text-5xl">🤫</p>
          <h1 className="text-3xl font-black text-white">Everyone has a word</h1>
          <p className="text-sm text-muted">Somebody&apos;s word is different — and they don&apos;t know it.</p>
        </div>
      )}

      <div className={cn("grid gap-3", cols)}>
        {game.cards.map((card, index) => {
          const owner = card.claimedBy ? seatById.get(card.claimedBy) : null;
          return owner ? (
            <ClaimedCard key={index} seat={owner} out={false} onPeek={() => onPeek(owner)} />
          ) : (
            <FaceDownCard
              key={index}
              index={index}
              disabled={!drawer}
              onClick={() => {
                if (!drawer) return;
                sfx.pick();
                onDraw(index, drawer);
              }}
            />
          );
        })}
      </div>

      {done ? (
        <Button
          size="lg"
          className="h-14 w-full bg-violet-500 text-base text-white shadow-[0_0_28px_rgba(139,92,246,0.35)] hover:bg-violet-500/90"
          onClick={() => {
            sfx.tick();
            onChange(startRound(game, secureRng));
          }}
        >
          <Mic className="h-5 w-5" />
          Start round 1
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------- word overlays */

function WordOverlay({
  overlay,
  game,
  onClose,
  onConfirmDraw,
  onShowPeek,
}: {
  overlay: NonNullable<Overlay>;
  game: GameState;
  onClose: () => void;
  onConfirmDraw: () => void;
  onShowPeek: () => void;
}) {
  const word =
    overlay.kind === "draw"
      ? game.cards[overlay.cardIndex]?.word
      : overlay.kind === "peek-show"
        ? cardOf(game, overlay.seat.seatId)?.word
        : null;

  useEffect(() => {
    if (overlay.kind !== "draw") return;
    // Let the pick swish land before the shimmer.
    const t = window.setTimeout(() => sfx.reveal(), 180);
    return () => window.clearTimeout(t);
  }, [overlay.kind]);

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col items-center justify-center bg-black/95 px-6 backdrop-blur">
      {overlay.kind === "peek-ask" ? (
        <div className="chip-pop w-full space-y-5 text-center">
          <p className="text-6xl">👀</p>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-danger">Peek alert</p>
            <h2 className="text-3xl font-black text-white">{overlay.seat.name} wants another look</h2>
            <p className="text-sm text-muted">Hand the phone to {overlay.seat.name}. Everyone else — eyes off.</p>
          </div>
          <div className="grid gap-2">
            <Button size="lg" className="h-14 bg-violet-500 text-base text-white hover:bg-violet-500/90" onClick={onShowPeek}>
              <Eye className="h-5 w-5" />
              I&apos;m {overlay.seat.name} — show me
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Never mind
            </Button>
          </div>
        </div>
      ) : (
        <div className="w-full space-y-6 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">
            {overlay.seat.name}&apos;s word · {game.categoryLabel}
          </p>
          <div className="card-flip relative mx-auto flex aspect-[3/4] w-64 flex-col items-center justify-center overflow-hidden rounded-[28px] border border-violet-300/50 bg-gradient-to-br from-[#fff7e3] to-[#f3e2b8] p-6 shadow-[0_0_60px_rgba(139,92,246,0.45)]">
            <VenetianMask className="absolute right-4 top-4 h-6 w-6 text-violet-900/25" />
            <span className="break-words text-4xl font-black leading-tight text-[#1c0f2e]">{word}</span>
            <span className="absolute bottom-4 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-900/40">
              don&apos;t say it out loud
            </span>
          </div>
          {overlay.kind === "draw" ? (
            <Button
              size="lg"
              className="h-14 w-full bg-violet-500 text-base text-white hover:bg-violet-500/90"
              onClick={onConfirmDraw}
            >
              <Check className="h-5 w-5" />
              OK, got it
            </Button>
          ) : (
            <Button size="lg" variant="secondary" className="h-14 w-full text-base" onClick={onClose}>
              <EyeOff className="h-5 w-5" />
              Hide it
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ clues */

function CluePhase({ game, onChange }: { game: GameState; onChange: (next: GameState) => void }) {
  const order = clueOrder(game);
  const speaker = order[game.clueIndex];

  return (
    <div className="space-y-5">
      {speaker ? (
        <div key={speaker.seatId} className="chip-pop space-y-2 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
            {game.clueIndex === 0 ? "Kicking off this round" : `Clue ${game.clueIndex + 1} of ${order.length}`}
          </p>
          <div className="flex items-center justify-center gap-3">
            <PlayerAvatar name={speaker.name} colorKey={speaker.colorKey} size="lg" />
            <h1 className="text-4xl font-black text-white">{speaker.name}</h1>
          </div>
          <p className="text-sm text-muted">One word or a short phrase about your word. Don&apos;t give it away.</p>
        </div>
      ) : null}

      <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
        {order.map((seat, i) => {
          const done = i < game.clueIndex;
          const now = i === game.clueIndex;
          return (
            <li
              key={seat.seatId}
              className={cn("flex min-h-12 items-center gap-3 px-3 py-1.5", now && "bg-violet-500/15")}
            >
              <span className="w-5 text-center text-xs font-black tabular-nums text-muted">{i + 1}</span>
              <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
              <span className={cn("min-w-0 flex-1 truncate text-sm font-bold", done ? "text-muted" : "text-white")}>
                {seat.name}
              </span>
              {done ? <Check className="h-4 w-4 text-success" /> : now ? <Mic className="h-4 w-4 text-violet-300" /> : null}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-2">
        <Button
          size="lg"
          className="h-14 w-full bg-violet-500 text-base text-white hover:bg-violet-500/90"
          onClick={() => {
            sfx.tick();
            onChange(nextClue(game));
          }}
        >
          {game.clueIndex >= order.length - 1 ? "Everyone's spoken — vote" : "Next clue"}
          <ChevronRight className="h-5 w-5" />
        </Button>
        {game.clueIndex < order.length - 1 ? (
          <Button variant="ghost" onClick={() => onChange(openVote(game))}>
            Skip to the vote
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- vote */

function VotePhase({ game, onChange }: { game: GameState; onChange: (next: GameState) => void }) {
  const [target, setTarget] = useState<Seat | null>(null);
  const alive = aliveSeats(game);

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-5xl">🗳️</p>
        <h1 className="text-3xl font-black text-white">Who&apos;s the imposter?</h1>
        <p className="text-sm text-muted">Argue it out, then everyone points on 3. Tap who the table voted out.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {alive.map((seat) => (
          <button
            key={seat.seatId}
            type="button"
            onClick={() => setTarget(seat)}
            className="flex min-h-16 items-center gap-2 rounded-2xl border border-border bg-elevated px-3 text-left transition active:scale-[0.98]"
          >
            <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="md" />
            <span className="min-w-0 flex-1 truncate text-sm font-black text-white">{seat.name}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted">Tied? Re-vote between the tied players before you tap.</p>

      <BottomSheet open={target !== null} onClose={() => setTarget(null)} title="Lock in the vote?">
        {target ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
              <PlayerAvatar name={target.name} colorKey={target.colorKey} size="lg" />
              <div>
                <p className="text-lg font-black text-white">{target.name}</p>
                <p className="text-xs text-muted">is out, and their card gets flipped.</p>
              </div>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="h-14 w-full text-base"
              onClick={() => {
                sfx.drumroll();
                onChange(voteOut(game, target.seatId));
                setTarget(null);
              }}
            >
              <Skull className="h-5 w-5" />
              Vote {target.name} out
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}

/* ----------------------------------------------------------------- reveal */

const SUSPENSE_MS = 1300;

function RevealPhase({ game, onChange }: { game: GameState; onChange: (next: GameState) => void }) {
  const out = lastElimination(game);
  const seat = game.seats.find((s) => s.seatId === out?.seatId);
  const [shown, setShown] = useState(false);
  const played = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setShown(true);
      if (played.current) return;
      played.current = true;
      if (out?.role === "imposter") sfx.caught();
      else sfx.civilian();
    }, SUSPENSE_MS);
    return () => window.clearTimeout(t);
  }, [out?.role]);

  if (!out || !seat) return null;

  const imposter = out.role === "imposter";
  const impostersLeft = aliveSeats(game).filter((s) => cardOf(game, s.seatId)?.role === "imposter").length;

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 text-center">
      {!shown ? (
        <div className="space-y-3">
          <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="lg" className="mx-auto h-20 w-20 animate-pulse text-xl" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-muted">Flipping {seat.name}&apos;s card…</p>
        </div>
      ) : (
        <div className="card-flip space-y-4">
          <p className="text-7xl">{imposter ? "🎭" : "😬"}</p>
          <div className="space-y-1">
            <p className={cn("text-xs font-bold uppercase tracking-[0.3em]", imposter ? "text-success" : "text-red-danger")}>
              {imposter ? "Caught one!" : "Wrong call"}
            </p>
            <h1 className="text-4xl font-black text-white">
              {seat.name} was {imposter ? "an Imposter" : "a Civilian"}
            </h1>
            {!game.winner ? (
              <p className="text-sm text-muted">
                {imposter
                  ? `${impostersLeft} imposter${impostersLeft === 1 ? " is" : "s are"} still hiding.`
                  : "The imposter is still among you."}
              </p>
            ) : null}
          </div>

          {game.winner ? (
            <Button
              size="lg"
              className="h-14 w-full bg-violet-500 text-base text-white hover:bg-violet-500/90"
              onClick={() => {
                if (game.winner === "imposters") sfx.imposterWins();
                else sfx.fanfare();
                onChange(finishGame(game));
              }}
            >
              <Trophy className="h-5 w-5" />
              See who won
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-14 w-full bg-violet-500 text-base text-white hover:bg-violet-500/90"
              onClick={() => {
                sfx.tick();
                onChange(startRound(game, secureRng));
              }}
            >
              <Mic className="h-5 w-5" />
              Start round {game.round + 1}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- over */

function OverPhase({
  game,
  save,
  onDone,
}: {
  game: GameState;
  save: SaveState & { retry: () => void };
  onDone: () => void;
}) {
  const scores = scoreGame(game).sort((a, b) => b.points - a.points);
  const seatById = new Map(game.seats.map((s) => [s.seatId, s]));
  const imposters = scores.filter((s) => s.role === "imposter").map((s) => seatById.get(s.seatId)!);
  const imposterWin = game.winner === "imposters";

  const mostPeeks = Object.entries(game.peeks).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-[24px] border border-border bg-elevated p-5 text-center">
        <Confetti fire />
        <p className="text-6xl">{imposterWin ? "🎭" : "🕵️"}</p>
        <p className={cn("mt-2 text-xs font-bold uppercase tracking-[0.3em]", imposterWin ? "text-red-danger" : "text-success")}>
          {imposterWin ? "Fooled you all" : "Case closed"}
        </p>
        <h1 className="text-3xl font-black text-white">
          {imposterWin ? (imposters.length > 1 ? "The Imposters win!" : "The Imposter wins!") : "Civilians win!"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {imposters.map((s) => s.name).join(" & ")} {imposters.length > 1 ? "were the imposters" : "was the imposter"} ·{" "}
          {game.round} round{game.round === 1 ? "" : "s"}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <div className="rounded-2xl border border-border bg-background/60 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Civilians had</p>
            <p className="text-xl font-black text-cream">{game.civilianWord}</p>
          </div>
          <div className="rounded-2xl border border-violet-400/40 bg-violet-500/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-300">Imposter had</p>
            <p className="text-xl font-black text-violet-100">{game.imposterWord}</p>
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-bold text-white">Points this game</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
          {scores.map((s) => {
            const seat = seatById.get(s.seatId)!;
            return (
              <div key={s.seatId} className="flex min-h-12 items-center gap-3 px-3 py-2">
                <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {seat.name} {s.role === "imposter" ? "🎭" : ""}
                  </p>
                  <p className="text-[11px] text-muted">
                    {s.eliminatedRound ? `Out in round ${s.eliminatedRound}` : "Survived"} · {s.roundsSurvived} round
                    {s.roundsSurvived === 1 ? "" : "s"}
                    {s.bonus ? ` + ${s.bonus} victory bonus` : ""}
                  </p>
                </div>
                <span className={cn("text-lg font-black tabular-nums", s.points > 0 ? "text-gold-brand" : "text-muted")}>
                  +{s.points}
                </span>
              </div>
            );
          })}
        </div>
        {mostPeeks && mostPeeks[1] > 0 ? (
          <p className="text-center text-xs text-muted">
            👀 Most paranoid: <span className="font-bold text-cream">{seatById.get(mostPeeks[0])?.name}</span> peeked{" "}
            {mostPeeks[1]} time{mostPeeks[1] === 1 ? "" : "s"}
          </p>
        ) : null}
      </section>

      {save.status === "error" ? (
        <div className="space-y-2 rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">
          <p>Couldn&apos;t save this game to the scoreboard{save.message ? `: ${save.message}` : "."}</p>
          <Button variant="secondary" size="sm" onClick={save.retry}>
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : null}

      <Button
        size="lg"
        disabled={save.status !== "saved"}
        className="h-14 w-full bg-violet-500 text-base text-white hover:bg-violet-500/90"
        onClick={onDone}
      >
        {save.status === "saving" || save.status === "idle" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Saving scores…
          </>
        ) : (
          <>
            <Trophy className="h-5 w-5" />
            Scoreboard & next game
          </>
        )}
      </Button>
    </div>
  );
}
