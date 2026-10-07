"use client";

import { Eye, Loader2, LogOut, Moon, RotateCcw, Sun, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/shared/confetti";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  awardsFor,
  scoreGame,
  seatName,
  voteRuleOf,
  walk,
  type GameState,
  type StoryEntry,
} from "@/features/mafia/engine";
import { RoleBadge } from "@/features/mafia/components/role-card";
import { ROLES } from "@/features/mafia/script";
import { cn } from "@/lib/utils";

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string; retry: () => void };

export function StoryPhase({ game, save, onDone }: { game: GameState; save: SaveState; onDone: () => void }) {
  const ledger = useMemo(() => walk(game), [game]);
  const scores = useMemo(() => scoreGame(game).sort((a, b) => b.points - a.points), [game]);
  const awards = useMemo(() => awardsFor(game), [game]);
  const seatById = new Map(game.seats.map((s) => [s.seatId, s]));
  const mafiaWin = ledger.winner === "mafia";
  const family = game.seats.filter((s) => game.roles[s.seatId] === "mafia");

  return (
    <div className="space-y-6">
      {/* the verdict on the whole game */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[28px] border p-6 text-center",
          mafiaWin
            ? "vignette border-red-brand/50 bg-gradient-to-b from-[#2a0509] to-black"
            : "border-gold-brand/40 bg-gradient-to-b from-[#2a1f08] to-black",
        )}
      >
        {!mafiaWin ? <Confetti fire /> : null}
        <p className="chip-pop text-7xl">{mafiaWin ? "🔪" : "🏘️"}</p>
        <p
          className={cn(
            "mt-3 text-xs font-bold uppercase tracking-[0.35em]",
            mafiaWin ? "text-red-danger" : "text-gold-brand",
          )}
        >
          {mafiaWin ? "The family wins" : "The town wins"}
        </p>
        <h1 className="mt-1 text-3xl font-black text-white">
          {mafiaWin ? "The mafia runs this town" : "The town is safe"}
        </h1>
        <p className="mt-2 text-sm text-cream/70">
          {family.map((s) => s.name).join(" & ")} {family.length > 1 ? "were the mafia" : "was the mafia"} ·{" "}
          {ledger.nights} night{ledger.nights === 1 ? "" : "s"}
        </p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold text-cream">
          <Eye className="h-3.5 w-3.5" />
          Narrated by {game.god.name}
        </p>
      </div>

      {awards.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-bold text-white">Awards</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {awards.map((a, i) => (
              <div
                key={a.id}
                style={{ animationDelay: `${300 + i * 90}ms` }}
                className="fade-up w-36 shrink-0 rounded-2xl border border-border bg-elevated p-3"
              >
                <p className="text-3xl">{a.emoji}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gold-brand">{a.title}</p>
                <p className="truncate text-sm font-black text-white">{seatById.get(a.seatId)?.name}</p>
                <p className="text-[11px] leading-4 text-muted">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className="font-bold text-white">The story</h2>
        <ol className="relative space-y-3 border-l border-white/10 pl-5">
          {ledger.story.map((entry, i) => (
            <li key={i} style={{ animationDelay: `${500 + i * 120}ms` }} className="fade-up relative">
              <StoryLine game={game} entry={entry} />
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="font-bold text-white">The cast & points</h2>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
          {scores.map((s) => {
            const seat = seatById.get(s.seatId)!;
            const fate = s.diedNight
              ? `Killed night ${s.diedNight}`
              : s.votedOutDay
                ? `Voted out day ${s.votedOutDay}`
                : s.leftGame
                  ? "Left early"
                  : "Survived";
            const extras = [
              `+${s.survived} survival`,
              s.bonus ? `+${s.bonus} win` : null,
              s.saves ? `${s.saves} save${s.saves === 1 ? "" : "s"}` : null,
              s.finds ? `${s.finds} found` : null,
            ].filter(Boolean);
            return (
              <div key={s.seatId} className="flex min-h-14 items-center gap-3 px-3 py-2">
                <PlayerAvatar
                  name={seat.name}
                  colorKey={seat.colorKey}
                  size="sm"
                  className={cn(fate !== "Survived" && "grayscale")}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-white">{seat.name}</p>
                    <RoleBadge role={s.role} />
                  </div>
                  <p className="truncate text-[11px] text-muted">
                    {fate} · {extras.join(" · ")}
                  </p>
                </div>
                <span className={cn("text-lg font-black tabular-nums", s.won ? "text-gold-brand" : "text-muted")}>
                  +{s.points}
                </span>
              </div>
            );
          })}
        </div>
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
        className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow hover:bg-red-brand/90"
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

function Dot({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "absolute -left-[31px] top-0 flex h-5 w-5 items-center justify-center rounded-full border",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StoryLine({ game, entry }: { game: GameState; entry: StoryEntry }) {
  const name = (id: string | null) => seatName(game, id);

  if (entry.kind === "night") {
    const bits: string[] = [];
    bits.push(entry.mafia ? `The mafia went for ${name(entry.mafia)}.` : "The mafia couldn't agree on a target.");
    if (entry.doctorSeatId) {
      bits.push(
        entry.doctor
          ? `${name(entry.doctorSeatId)} the doctor protected ${name(entry.doctor)}.`
          : "The doctor sat this one out.",
      );
    } else if (game.settings.doctor) {
      bits.push("The doctor was already dead.");
    }
    if (entry.detectiveSeatId && entry.detective) {
      bits.push(
        `${name(entry.detectiveSeatId)} checked ${name(entry.detective)} — ${entry.foundMafia ? "mafia! 👍" : "clean 👎"}`,
      );
    }

    return (
      <div>
        <Dot className="border-indigo-300/40 bg-[#0b1030] text-indigo-200">
          <Moon className="h-3 w-3" />
        </Dot>
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-200/80">Night {entry.night}</p>
        <p className="text-sm leading-6 text-cream/80">{bits.join(" ")}</p>
        <p
          className={cn(
            "mt-0.5 text-sm font-black",
            entry.killed ? "text-red-danger" : entry.saved ? "text-emerald-300" : "text-cream",
          )}
        >
          {entry.killed
            ? `🩸 ${name(entry.killed)} (${ROLES[game.roles[entry.killed]].label}) was killed.`
            : entry.saved
              ? "🛡️ Saved — nobody died."
              : "Nobody died."}
        </p>
      </div>
    );
  }

  if (entry.kind === "day") {
    return (
      <div>
        <Dot className="border-gold-brand/40 bg-[#2a1f08] text-gold-brand">
          <Sun className="h-3 w-3" />
        </Dot>
        <p className="text-xs font-bold uppercase tracking-widest text-gold-brand/80">Day {entry.day}</p>
        <p className="text-sm leading-6 text-cream/80">
          {entry.tallies.length > 0
            ? entry.tallies.map((t) => `${name(t.seatId)} ✋${t.hands}`).join(" · ") +
              (voteRuleOf(game.settings) === "majority" ? ` (needed ${entry.majority})` : "")
            : "The town spared everyone."}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-black",
            entry.out && game.roles[entry.out] === "mafia" ? "text-success" : "text-cream",
          )}
        >
          {entry.out
            ? `⚖️ ${name(entry.out)} voted out — ${game.roles[entry.out] === "mafia" ? "mafia!" : `innocent ${ROLES[game.roles[entry.out]].label.toLowerCase()}.`}`
            : "Nobody was voted out."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Dot className="border-border bg-elevated text-muted">
        <LogOut className="h-3 w-3" />
      </Dot>
      <p className="text-sm text-cream/80">
        {name(entry.seatId)} ({ROLES[game.roles[entry.seatId]].label}) left the game.
      </p>
    </div>
  );
}
