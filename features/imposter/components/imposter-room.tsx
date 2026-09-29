"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Crown,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Trophy,
  UserPlus,
  VenetianMask,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { PlayerPickerSheet, type CreatePlayerResult, type PickerPlayer } from "@/components/shared/player-picker";
import { savePlayer } from "@/features/players/actions";
import {
  archiveImposterRoom,
  recordImposterGame,
  reopenImposterRoom,
  updateImposterSeats,
} from "@/features/imposter/actions";
import { GameTable } from "@/features/imposter/components/game-table";
import {
  IMPOSTER_WIN_BONUS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  createGame,
  maxImposters,
  pickPair,
  suggestedImposters,
  type GameState,
} from "@/features/imposter/engine";
import { clearGame, loadGame, newGameId, secureRng, storeGame } from "@/features/imposter/local-game";
import type { ImposterRoomView } from "@/features/imposter/queries";
import { sfx } from "@/features/imposter/sounds";
import { MIXED_CATEGORY_ID, WORD_CATEGORIES } from "@/features/imposter/words";
import { cn } from "@/lib/utils";

type SaveStatus = { status: "idle" | "saving" | "saved" | "error"; message?: string };

const SETTINGS_KEY = "oth-imposter-settings";

export function ImposterRoom({ view, players }: { view: ImposterRoomView; players: PickerPlayer[] }) {
  const router = useRouter();
  const roomId = view.room.id;
  const archived = view.room.status === "archived";

  const [game, setGame] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [save, setSave] = useState<SaveStatus>({ status: "idle" });

  // Resume a deal that was in progress on this phone.
  useEffect(() => {
    setGame(loadGame(roomId));
    setHydrated(true);
  }, [roomId]);

  const update = useCallback((next: GameState) => {
    storeGame(next);
    setGame(next);
  }, []);

  const saveGame = useCallback(
    async (finished: GameState) => {
      setSave({ status: "saving" });
      try {
        const result = await recordImposterGame(finished);
        if (!result.ok) {
          setSave({ status: "error", message: result.message });
          return;
        }
        setSave({ status: "saved" });
        router.refresh();
      } catch {
        setSave({ status: "error", message: "no connection" });
      }
    },
    [router],
  );

  // A finished game records itself once; retries reuse the same game id, so it can't double-count.
  useEffect(() => {
    if (game?.phase === "over" && save.status === "idle") void saveGame(game);
  }, [game, save.status, saveGame]);

  if (hydrated && game) {
    return (
      <GameTable
        game={game}
        roomTitle={view.room.title}
        onChange={update}
        onAbandon={() => {
          clearGame(roomId);
          setGame(null);
          setSave({ status: "idle" });
        }}
        onDone={() => {
          clearGame(roomId);
          setGame(null);
          setSave({ status: "idle" });
        }}
        save={{ ...save, retry: () => void saveGame(game) }}
      />
    );
  }

  return (
    <Lobby
      view={view}
      players={players}
      archived={archived}
      ready={hydrated}
      onDeal={(imposterCount, categoryId) => {
        const seats = view.seats
          .filter((s) => s.active)
          .map((s) => ({ seatId: s.seatId, name: s.name, colorKey: s.colorKey }));
        const pair = pickPair(categoryId, view.usedPairKeys, secureRng);
        sfx.pick();
        setSave({ status: "idle" });
        update(createGame({ gameId: newGameId(), roomId, seats, imposterCount, pair, rng: secureRng }));
      }}
    />
  );
}

/* ------------------------------------------------------------------ lobby */

function Lobby({
  view,
  players,
  archived,
  ready,
  onDeal,
}: {
  view: ImposterRoomView;
  players: PickerPlayer[];
  archived: boolean;
  ready: boolean;
  onDeal: (imposterCount: number, categoryId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Lineup edits apply instantly and reconcile when the server answers.
  const serverLineup = useMemo(() => view.seats.filter((s) => s.active).map((s) => s.playerId), [view.seats]);
  const [lineup, setLineup] = useState(serverLineup);
  useEffect(() => setLineup(serverLineup), [serverLineup]);

  const [extraPlayers, setExtraPlayers] = useState<PickerPlayer[]>([]);
  const allPlayers = useMemo(() => {
    const known = new Set(players.map((p) => p.id));
    return [...extraPlayers.filter((p) => !known.has(p.id)), ...players];
  }, [players, extraPlayers]);

  const seatByPlayer = useMemo(() => new Map(view.seats.map((s) => [s.playerId, s])), [view.seats]);
  const playerById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  const count = lineup.length;
  const [imposterCount, setImposterCount] = useState(() => suggestedImposters(Math.max(count, MIN_PLAYERS)));
  const [categoryId, setCategoryId] = useState(MIXED_CATEGORY_ID);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as { categoryId?: string };
      if (saved.categoryId && (saved.categoryId === MIXED_CATEGORY_ID || WORD_CATEGORIES.some((c) => c.id === saved.categoryId))) {
        setCategoryId(saved.categoryId);
      }
    } catch {
      // first visit
    }
  }, []);

  useEffect(() => {
    setImposterCount((n) => Math.min(Math.max(1, n), maxImposters(Math.max(count, MIN_PLAYERS))));
  }, [count]);

  function chooseCategory(id: string) {
    setCategoryId(id);
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ categoryId: id }));
    } catch {
      // not remembered — fine
    }
  }

  function commitLineup(next: string[]) {
    setError(null);
    const previous = lineup;
    setLineup(next);
    startTransition(async () => {
      const result = await updateImposterSeats({ roomId: view.room.id, playerIds: next });
      if (!result.ok) {
        setLineup(previous);
        setError(result.message ?? "Couldn't update the lineup.");
        return;
      }
      router.refresh();
    });
  }

  function move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= lineup.length) return;
    const next = [...lineup];
    [next[index], next[target]] = [next[target], next[index]];
    commitLineup(next);
  }

  async function createPlayer(name: string): Promise<CreatePlayerResult> {
    const result = await savePlayer({ name });
    if (result.ok && result.player) {
      const created = result.player;
      setExtraPlayers((current) => [created, ...current]);
    }
    return result;
  }

  function setStatus(action: typeof archiveImposterRoom) {
    startTransition(async () => {
      const result = await action(view.room.id);
      if (!result.ok) setError(result.message ?? "Something went wrong.");
      else router.refresh();
    });
  }

  const standingsBySeat = view.standings.filter((row) => row.games > 0);
  const seatById = new Map(view.seats.map((s) => [s.seatId, s]));
  const canDeal = ready && !archived && count >= MIN_PLAYERS && !pending;
  const categories = [{ id: MIXED_CATEGORY_ID, label: "Mixed", emoji: "🎲" }, ...WORD_CATEGORIES];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-violet-300">Imposter</p>
        <h1 className="text-3xl font-black text-white">{view.room.title}</h1>
        <p className="text-xs text-muted">
          {count} playing · {view.games.length} game{view.games.length === 1 ? "" : "s"} played
          {archived ? " · archived" : ""}
        </p>
      </div>

      {!archived ? (
        <Card className="space-y-4 border-violet-400/30 shadow-[0_0_32px_rgba(139,92,246,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-white">Imposters</h2>
              <p className="text-xs text-muted">
                Suggested for {count}: {suggestedImposters(Math.max(count, MIN_PLAYERS))}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Fewer imposters"
                disabled={imposterCount <= 1}
                onClick={() => setImposterCount((n) => n - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-2xl font-black tabular-nums text-white">{imposterCount}</span>
              <button
                type="button"
                aria-label="More imposters"
                disabled={imposterCount >= maxImposters(Math.max(count, MIN_PLAYERS))}
                onClick={() => setImposterCount((n) => n + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-white">Words from</h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={categoryId === c.id}
                  onClick={() => chooseCategory(c.id)}
                  className={cn(
                    "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold",
                    categoryId === c.id
                      ? "border-violet-400/70 bg-violet-500/15 text-violet-200"
                      : "border-border bg-background text-cream",
                  )}
                >
                  <span>{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            disabled={!canDeal}
            onClick={() => onDeal(imposterCount, categoryId)}
            className="h-14 w-full bg-violet-500 text-base text-white shadow-[0_0_28px_rgba(139,92,246,0.35)] hover:bg-violet-500/90"
          >
            {!ready ? <Loader2 className="h-5 w-5 animate-spin" /> : <VenetianMask className="h-5 w-5" />}
            {count < MIN_PLAYERS ? `Needs ${MIN_PLAYERS}+ players` : "Deal the cards"}
          </Button>
        </Card>
      ) : null}

      {standingsBySeat.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-brand" />
            <h2 className="font-bold text-white">Scoreboard</h2>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
            {standingsBySeat.map((row, i) => {
              const seat = seatById.get(row.seatId);
              if (!seat) return null;
              return (
                <div key={row.seatId} className="flex min-h-12 items-center gap-3 px-3 py-2">
                  <span className="w-5 text-center text-sm font-black tabular-nums text-muted">
                    {i === 0 ? "👑" : i + 1}
                  </span>
                  <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {seat.name}
                      {seat.isHostPlayer ? <Crown className="mb-0.5 ml-1 inline h-3 w-3 text-gold-brand" /> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {row.wins}/{row.games} won
                      {row.imposterGames > 0 ? ` · 🎭 ${row.imposterWins}/${row.imposterGames} as imposter` : ""}
                    </p>
                  </div>
                  <span className="text-lg font-black tabular-nums text-gold-brand">{row.points}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">Pass order</h2>
            <p className="text-[11px] text-muted">The phone goes round in this order. Match how you&apos;re sitting.</p>
          </div>
          {!archived ? (
            <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)} disabled={pending}>
              <UserPlus className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
          {lineup.map((playerId, index) => {
            const seat = seatByPlayer.get(playerId);
            const player = playerById.get(playerId);
            const name = seat?.name ?? player?.name ?? "Player";
            return (
              <div key={playerId} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
                <span className="w-5 text-center text-xs font-black tabular-nums text-muted">{index + 1}</span>
                <PlayerAvatar name={name} colorKey={seat?.colorKey ?? player?.color_key ?? null} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                  {name}
                  {seat?.isHostPlayer ? <Crown className="mb-0.5 ml-1 inline h-3 w-3 text-gold-brand" /> : null}
                </span>
                {!archived ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${name} up`}
                      disabled={index === 0 || pending}
                      onClick={() => move(index, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted disabled:opacity-25"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${name} down`}
                      disabled={index === lineup.length - 1 || pending}
                      onClick={() => move(index, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted disabled:opacity-25"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      {view.games.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-bold text-white">Past games</h2>
          <div className="space-y-2">
            {view.games.slice(0, 10).map((g, i) => {
              const imposters = g.scores
                .filter((s) => s.role === "imposter")
                .map((s) => seatById.get(s.room_player_id)?.name ?? "?");
              return (
                <div key={g.id} className="rounded-2xl border border-border bg-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">
                      Game {view.games.length - i} · {g.civilian_word}{" "}
                      <span className="text-muted">vs</span> <span className="text-violet-200">{g.imposter_word}</span>
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        g.winner === "imposters" ? "bg-violet-500/20 text-violet-200" : "bg-success/15 text-success",
                      )}
                    >
                      {g.winner === "imposters" ? "Imposter won" : "Civilians won"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    🎭 {imposters.join(" & ")} · {g.rounds_played} round{g.rounds_played === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <HowToPlay />

      <div className="pt-2">
        {archived ? (
          <Button variant="secondary" className="w-full" disabled={pending} onClick={() => setStatus(reopenImposterRoom)}>
            <RotateCcw className="h-4 w-4" />
            Reopen this room
          </Button>
        ) : (
          <Button variant="ghost" className="w-full text-muted" disabled={pending} onClick={() => setStatus(archiveImposterRoom)}>
            <Archive className="h-4 w-4" />
            Wrap up the night (archive room)
          </Button>
        )}
      </div>

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Who's playing?"
        saveLabel="Update lineup"
        description="Anyone you take out sits out the next deal but keeps their points."
        players={allPlayers}
        selectedIds={lineup}
        max={MAX_PLAYERS}
        onCreatePlayer={createPlayer}
        onSave={(ids) => {
          setPickerOpen(false);
          // Keep everyone's existing place; newcomers join at the end of the pass order.
          const kept = lineup.filter((id) => ids.includes(id));
          const added = ids.filter((id) => !lineup.includes(id));
          commitLineup([...kept, ...added]);
        }}
      />
    </div>
  );
}

export function HowToPlay({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-border bg-elevated p-4">
      <summary className="cursor-pointer list-none font-bold text-white">
        How to play <span className="text-muted group-open:hidden">›</span>
      </summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
        <li>
          <span className="text-cream">The deal.</span> Pass the phone round in order. Each player taps a face-down card,
          reads their word alone, and taps OK. Everyone gets the same word — except the imposter, whose word is close but
          different. Nobody is told who the imposter is, not even the imposter.
        </li>
        <li>
          <span className="text-cream">Clues.</span> Starting from a random player and going round, everyone gives one
          short clue about their word. Too vague and you look suspicious; too obvious and the imposter catches on.
        </li>
        <li>
          <span className="text-cream">Vote.</span> Argue, then point. Whoever the table picks is out and their card is
          flipped: civilian or imposter.
        </li>
        <li>
          <span className="text-cream">Winning.</span> Civilians win when every imposter is out. Imposters win if they
          survive until only one civilian is left.
        </li>
        <li>
          <span className="text-cream">Points.</span> +1 for every vote you survive. An imposter who survives to the win
          gets +{IMPOSTER_WIN_BONUS} on top.
        </li>
        <li>
          <span className="text-cream">Forgot your word?</span> Tap &ldquo;See card&rdquo; — it plays a loud alert so
          the whole table knows someone peeked.
        </li>
      </ol>
    </details>
  );
}
