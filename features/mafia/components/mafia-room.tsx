"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  Crown,
  Drama,
  Eye,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { PlayerPickerSheet, type CreatePlayerResult, type PickerPlayer } from "@/components/shared/player-picker";
import { savePlayer } from "@/features/players/actions";
import { archiveMafiaRoom, recordMafiaGame, reopenMafiaRoom, updateMafiaSeats } from "@/features/mafia/actions";
import { GameTable } from "@/features/mafia/components/game-table";
import {
  DAY_TIMER_OPTIONS,
  DEFAULT_SELF_SAVE,
  DEFAULT_VOTE_RULE,
  FIND_POINTS,
  MAFIA_ALIVE_BONUS,
  MAX_CREW,
  MIN_CREW,
  SAVE_POINTS,
  WIN_BONUS,
  createGame,
  defaultSettings,
  maxMafia,
  suggestGod,
  suggestedMafia,
  type GameState,
  type Role,
  type SelfSave,
  type Settings,
  type VoteRule,
} from "@/features/mafia/engine";
import { clearGame, loadGame, newGameId, secureRng, storeGame } from "@/features/mafia/local-game";
import type { MafiaRoomView } from "@/features/mafia/queries";
import { ROLES } from "@/features/mafia/script";
import { sfx } from "@/features/mafia/sounds";
import { cn } from "@/lib/utils";

type SaveStatus = { status: "idle" | "saving" | "saved" | "error"; message?: string };

const SETTINGS_KEY = "oth-mafia-settings";
const RANDOM_GOD = "random";

const SELF_SAVE_OPTIONS: { value: SelfSave; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "once", label: "Once a game" },
  { value: "always", label: "Any night" },
];

const VOTE_RULE_OPTIONS: { value: VoteRule; label: string }[] = [
  { value: "most", label: "Most hands" },
  { value: "majority", label: "Over half the town" },
];

export function MafiaRoom({ view, players }: { view: MafiaRoomView; players: PickerPlayer[] }) {
  const router = useRouter();
  const roomId = view.room.id;
  const archived = view.room.status === "archived";

  const [game, setGame] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [save, setSave] = useState<SaveStatus>({ status: "idle" });

  // Resume a game that was in progress on this phone.
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
        const { undo: _undo, ...payload } = finished;
        void _undo;
        const result = await recordMafiaGame(payload);
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

  const close = () => {
    clearGame(roomId);
    setGame(null);
    setSave({ status: "idle" });
  };

  if (hydrated && game) {
    return (
      <GameTable
        game={game}
        roomTitle={view.room.title}
        onChange={update}
        onAbandon={close}
        onDone={close}
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
      onDeal={(godSeatId, settings) => {
        const active = view.seats.filter((s) => s.active);
        const god = active.find((s) => s.seatId === godSeatId)!;
        const seats = active
          .filter((s) => s.seatId !== godSeatId)
          .map((s) => ({ seatId: s.seatId, name: s.name, colorKey: s.colorKey }));
        sfx.flip();
        setSave({ status: "idle" });
        update(
          createGame({
            gameId: newGameId(),
            roomId,
            god: { seatId: god.seatId, name: god.name, colorKey: god.colorKey },
            seats,
            settings,
            rng: secureRng,
          }),
        );
      }}
    />
  );
}

/* ------------------------------------------------------------------ lobby */

function Toggle({
  on,
  label,
  hint,
  onChange,
}: {
  on: boolean;
  label: string;
  hint: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="block text-[11px] text-muted">{hint}</span>
      </span>
      <span
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-red-brand" : "bg-white/15")}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", on ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-white">{label}</p>
      <div className="flex gap-1 rounded-full border border-border bg-background/60 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 flex-1 rounded-full px-2 text-xs font-bold transition",
              value === o.value ? "bg-red-brand text-white shadow-red-glow" : "text-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The dice pick God: names flick past fast, slow down like a roulette wheel,
 * and land — then a beat to let it sink in before the deal starts.
 */
function GodRoll({
  crew,
  finalSeatId,
  onCancel,
  onDone,
}: {
  crew: { seatId: string; name: string; colorKey: string | null }[];
  finalSeatId: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const finalIndex = Math.max(
    0,
    crew.findIndex((s) => s.seatId === finalSeatId),
  );
  const [index, setIndex] = useState(0);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    // Enough flicks to go round a couple of times, ending exactly on God.
    const laps = crew.length * 2 + ((finalIndex - 0 + crew.length) % crew.length);
    const timers: number[] = [];
    let at = 0;
    for (let i = 1; i <= laps; i += 1) {
      at += 45 + Math.pow(i / laps, 3) * 380;
      timers.push(
        window.setTimeout(() => {
          setIndex(i % crew.length);
          if (i === laps) {
            setLanded(true);
            sfx.pass();
          } else {
            sfx.tap();
          }
        }, at),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [crew.length, finalIndex]);

  const seat = crew[index] ?? crew[0];

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col items-center justify-center gap-6 bg-black/95 px-6 text-center backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-danger">
        {landed ? "The dice have spoken" : "Rolling for God…"}
      </p>
      <div key={landed ? "landed" : seat.seatId} className={cn("space-y-3", landed && "chip-pop")}>
        <div className="relative mx-auto w-fit">
          <div
            className={cn(
              "absolute inset-0 -z-10 rounded-full blur-2xl transition-opacity",
              landed ? "bg-red-brand/50 opacity-100" : "opacity-0",
            )}
          />
          <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="lg" className="h-24 w-24 text-2xl" />
        </div>
        <h2 className="text-4xl font-black text-white">{seat.name}</h2>
        {landed ? <p className="text-sm text-muted">narrates tonight 👁️ — everyone else gets a role.</p> : null}
      </div>
      <div
        className={cn("w-full space-y-2 transition-opacity", landed ? "opacity-100" : "pointer-events-none opacity-0")}
      >
        <Button size="lg" className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow" onClick={onDone}>
          <Drama className="h-5 w-5" />
          Start the deal
        </Button>
        <Button variant="ghost" className="w-full text-muted" onClick={onCancel}>
          Back to the lobby
        </Button>
      </div>
    </div>
  );
}

function Lobby({
  view,
  players,
  archived,
  ready,
  onDeal,
}: {
  view: MafiaRoomView;
  players: PickerPlayer[];
  archived: boolean;
  ready: boolean;
  onDeal: (godSeatId: string, settings: Settings) => void;
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
  const narrated = useMemo(() => new Map(view.standings.map((r) => [r.seatId, r.narrated])), [view.standings]);

  // God: whoever has narrated least, unless the host picks someone — or leaves it to the dice.
  const crewSeatIds = lineup.map((id) => seatByPlayer.get(id)?.seatId).filter((id): id is string => Boolean(id));
  const suggested = suggestGod(crewSeatIds, narrated);
  const [godChoice, setGodChoice] = useState<string | null>(null);
  const randomGod = godChoice === RANDOM_GOD;
  const godSeatId = randomGod ? null : godChoice && crewSeatIds.includes(godChoice) ? godChoice : suggested;
  const [rolling, setRolling] = useState<string | null>(null);

  function deal() {
    if (randomGod) {
      sfx.flip();
      setRolling(crewSeatIds[Math.floor(secureRng() * crewSeatIds.length)]);
    } else if (godSeatId) {
      onDeal(godSeatId, settings);
    }
  }

  const playerCount = Math.max(lineup.length - 1, 0);
  const [settings, setSettings] = useState<Settings>(() => defaultSettings(Math.max(playerCount, 5)));

  // Remember the house rules on this phone; the mafia count follows the table size.
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
      setSettings((s) => ({
        ...s,
        ...(typeof saved.doctor === "boolean" ? { doctor: saved.doctor } : {}),
        ...(typeof saved.detective === "boolean" ? { detective: saved.detective } : {}),
        ...(typeof saved.revealOnDeath === "boolean" ? { revealOnDeath: saved.revealOnDeath } : {}),
        ...(typeof saved.dayTimerSec === "number" ? { dayTimerSec: saved.dayTimerSec } : {}),
        ...(saved.doctorSelfSave && SELF_SAVE_OPTIONS.some((o) => o.value === saved.doctorSelfSave)
          ? { doctorSelfSave: saved.doctorSelfSave }
          : {}),
        ...(saved.voteRule && VOTE_RULE_OPTIONS.some((o) => o.value === saved.voteRule)
          ? { voteRule: saved.voteRule }
          : {}),
      }));
    } catch {
      // first visit
    }
  }, []);

  useEffect(() => {
    setSettings((s) => ({ ...s, mafiaCount: suggestedMafia(Math.max(playerCount, 5)) }));
  }, [playerCount]);

  function patch(next: Partial<Settings>) {
    setSettings((s) => {
      const merged = { ...s, ...next };
      try {
        const { mafiaCount: _m, ...rules } = merged;
        void _m;
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(rules));
      } catch {
        // not remembered — fine
      }
      return merged;
    });
  }

  function commitLineup(next: string[]) {
    setError(null);
    const previous = lineup;
    setLineup(next);
    startTransition(async () => {
      const result = await updateMafiaSeats({ roomId: view.room.id, playerIds: next });
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

  function setStatus(action: typeof archiveMafiaRoom) {
    startTransition(async () => {
      const result = await action(view.room.id);
      if (!result.ok) setError(result.message ?? "Something went wrong.");
      else router.refresh();
    });
  }

  const seatById = new Map(view.seats.map((s) => [s.seatId, s]));
  const standingsRows = view.standings.filter((row) => row.games > 0 || row.narrated > 0);
  const allSeated = lineup.every((id) => seatByPlayer.has(id));
  const canDeal =
    ready && !archived && lineup.length >= MIN_CREW && !pending && allSeated && (randomGod || Boolean(godSeatId));
  const mafiaCap = maxMafia(Math.max(playerCount, 5));

  const town: Role[] = [
    ...Array<Role>(settings.mafiaCount).fill("mafia"),
    ...(settings.doctor ? (["doctor"] as Role[]) : []),
    ...(settings.detective ? (["detective"] as Role[]) : []),
  ];
  while (town.length < playerCount) town.push("villager");

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-red-danger">Mafia</p>
        <h1 className="text-3xl font-black text-white">{view.room.title}</h1>
        <p className="text-xs text-muted">
          {lineup.length} in the crew · {view.games.length} game{view.games.length === 1 ? "" : "s"} played
          {archived ? " · archived" : ""}
        </p>
      </div>

      {!archived ? (
        <>
          <Card className="space-y-3 border-red-brand/30 shadow-red-glow">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 font-bold text-white">
                  <Eye className="h-4 w-4 text-red-danger" />
                  Tonight&apos;s God
                </h2>
                <p className="text-[11px] text-muted">God narrates and doesn&apos;t play. Pass it around.</p>
              </div>
            </div>
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                aria-pressed={randomGod}
                onClick={() => {
                  sfx.tap();
                  setGodChoice(RANDOM_GOD);
                }}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "rounded-full p-0.5 transition",
                    randomGod ? "bg-red-brand shadow-red-glow" : "bg-transparent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border border-dashed text-xl",
                      randomGod ? "border-white/40 bg-black" : "border-border bg-elevated",
                    )}
                  >
                    🎲
                  </span>
                </span>
                <span className={cn("text-[11px] font-bold", randomGod ? "text-white" : "text-muted")}>Random</span>
                <span className="text-[9px] text-muted">roll at deal</span>
              </button>
              {lineup.map((playerId) => {
                const seat = seatByPlayer.get(playerId);
                const player = playerById.get(playerId);
                const name = seat?.name ?? player?.name ?? "Player";
                const chosen = seat?.seatId === godSeatId;
                const times = seat ? (narrated.get(seat.seatId) ?? 0) : 0;
                return (
                  <button
                    key={playerId}
                    type="button"
                    disabled={!seat}
                    aria-pressed={chosen}
                    onClick={() => {
                      if (!seat) return;
                      sfx.tap();
                      setGodChoice(seat.seatId);
                    }}
                    className="flex w-16 shrink-0 flex-col items-center gap-1 disabled:opacity-40"
                  >
                    <span
                      className={cn(
                        "relative rounded-full p-0.5 transition",
                        chosen ? "bg-red-brand shadow-red-glow" : "bg-transparent",
                      )}
                    >
                      <PlayerAvatar name={name} colorKey={seat?.colorKey ?? player?.color_key ?? null} size="md" />
                      {chosen ? (
                        <span className="chip-pop absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[11px]">
                          👁️
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "w-full truncate text-center text-[11px] font-bold",
                        chosen ? "text-white" : "text-muted",
                      )}
                    >
                      {name}
                    </span>
                    <span className="text-[9px] text-muted">{times === 0 ? "new God" : `${times}× God`}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-white">Mafia</h2>
                <p className="text-xs text-muted">
                  Suggested for {playerCount} players: {suggestedMafia(Math.max(playerCount, 5))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Fewer mafia"
                  disabled={settings.mafiaCount <= 1}
                  onClick={() => patch({ mafiaCount: settings.mafiaCount - 1 })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span
                  key={settings.mafiaCount}
                  className="chip-pop w-8 text-center text-2xl font-black tabular-nums text-white"
                >
                  {settings.mafiaCount}
                </span>
                <button
                  type="button"
                  aria-label="More mafia"
                  disabled={settings.mafiaCount >= mafiaCap}
                  onClick={() => patch({ mafiaCount: settings.mafiaCount + 1 })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-cream disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <Toggle
              on={settings.doctor}
              label="🩺 Doctor"
              hint="Saves one person a night."
              onChange={(doctor) => patch({ doctor })}
            />
            {settings.doctor ? (
              <Choice
                label="Doctor can save themselves"
                value={settings.doctorSelfSave ?? DEFAULT_SELF_SAVE}
                options={SELF_SAVE_OPTIONS}
                onChange={(doctorSelfSave) => patch({ doctorSelfSave })}
              />
            ) : null}
            <Toggle
              on={settings.detective}
              label="🕵️ Detective"
              hint="Checks one person a night."
              onChange={(detective) => patch({ detective })}
            />
            <Toggle
              on={settings.revealOnDeath}
              label="Reveal roles when someone's out"
              hint="Faster games. Off keeps everyone guessing."
              onChange={(revealOnDeath) => patch({ revealOnDeath })}
            />

            <Choice
              label="Who goes at the vote"
              value={settings.voteRule ?? DEFAULT_VOTE_RULE}
              options={VOTE_RULE_OPTIONS}
              onChange={(voteRule) => patch({ voteRule })}
            />

            <div className="space-y-2">
              <p className="text-sm font-bold text-white">Day timer</p>
              <div className="grid grid-cols-4 gap-2">
                {DAY_TIMER_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    aria-pressed={settings.dayTimerSec === sec}
                    onClick={() => patch({ dayTimerSec: sec })}
                    className={cn(
                      "h-10 rounded-full border text-sm font-bold",
                      settings.dayTimerSec === sec
                        ? "border-red-brand bg-red-brand/15 text-white"
                        : "border-border text-muted",
                    )}
                  >
                    {sec === 0 ? "Off" : `${sec / 60} min`}
                  </button>
                ))}
              </div>
            </div>

            {playerCount > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-border bg-background/60 p-3">
                {town.map((role, i) => (
                  <span
                    key={`${role}-${i}-${town.length}-${settings.mafiaCount}`}
                    title={ROLES[role].label}
                    style={{ animationDelay: `${i * 35}ms` }}
                    className={cn(
                      "chip-pop flex h-9 w-9 items-center justify-center rounded-xl border bg-black/40 text-lg",
                      ROLES[role].ring,
                    )}
                  >
                    {ROLES[role].emoji}
                  </span>
                ))}
              </div>
            ) : null}

            <Button
              size="lg"
              disabled={!canDeal}
              onClick={deal}
              className="h-14 w-full bg-red-brand text-base text-white shadow-red-glow hover:bg-red-brand/90"
            >
              {!ready || pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Drama className="h-5 w-5" />}
              {lineup.length < MIN_CREW ? `Needs ${MIN_CREW}+ people (players + God)` : "Deal the roles"}
            </Button>
          </Card>
        </>
      ) : null}

      {standingsRows.length > 0 ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-brand" />
            <h2 className="font-bold text-white">Scoreboard</h2>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
            {standingsRows.map((row, i) => {
              const seat = seatById.get(row.seatId);
              if (!seat) return null;
              return (
                <div key={row.seatId} className="flex min-h-12 items-center gap-3 px-3 py-2">
                  <span className="w-5 text-center text-sm font-black tabular-nums text-muted">
                    {i === 0 && row.points > 0 ? "👑" : i + 1}
                  </span>
                  <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {seat.name}
                      {seat.isHostPlayer ? <Crown className="mb-0.5 ml-1 inline h-3 w-3 text-gold-brand" /> : null}
                    </p>
                    <p className="text-[11px] text-muted">
                      {row.wins}/{row.games} won
                      {row.mafiaGames > 0 ? ` · 🔪 ${row.mafiaWins}/${row.mafiaGames} as mafia` : ""}
                      {row.narrated > 0 ? ` · 👁️ ${row.narrated}× God` : ""}
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
            <h2 className="font-bold text-white">Seating</h2>
            <p className="text-[11px] text-muted">
              The phone goes round in this order for the deal. Match how you&apos;re sitting.
            </p>
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
            const isGod = seat?.seatId === godSeatId;
            return (
              <div key={playerId} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
                <span className="w-5 text-center text-xs font-black tabular-nums text-muted">{index + 1}</span>
                <PlayerAvatar name={name} colorKey={seat?.colorKey ?? player?.color_key ?? null} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                  {name}
                  {seat?.isHostPlayer ? <Crown className="mb-0.5 ml-1 inline h-3 w-3 text-gold-brand" /> : null}
                  {isGod ? (
                    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-red-danger">God</span>
                  ) : null}
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
              const family = g.scores
                .filter((s) => s.role === "mafia")
                .map((s) => seatById.get(s.room_player_id)?.name ?? "?");
              const god = seatById.get(g.god_room_player_id)?.name ?? "?";
              return (
                <div key={g.id} className="rounded-2xl border border-border bg-elevated p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">
                      Game {view.games.length - i} · {g.nights_played} night{g.nights_played === 1 ? "" : "s"}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        g.winner === "mafia" ? "bg-red-brand/20 text-red-200" : "bg-success/15 text-success",
                      )}
                    >
                      {g.winner === "mafia" ? "Mafia won" : "Town won"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    🔪 {family.join(" & ")} · 👁️ God: {god}
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
          <Button variant="secondary" className="w-full" disabled={pending} onClick={() => setStatus(reopenMafiaRoom)}>
            <RotateCcw className="h-4 w-4" />
            Reopen this room
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full text-muted"
            disabled={pending}
            onClick={() => setStatus(archiveMafiaRoom)}
          >
            <Archive className="h-4 w-4" />
            Wrap up the night (archive room)
          </Button>
        )}
      </div>

      {rolling ? (
        <GodRoll
          crew={crewSeatIds.map((id) => seatById.get(id)!).filter(Boolean)}
          finalSeatId={rolling}
          onCancel={() => setRolling(null)}
          onDone={() => {
            const god = rolling;
            setRolling(null);
            onDeal(god, settings);
          }}
        />
      ) : null}

      <PlayerPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Who's in the crew?"
        saveLabel="Update crew"
        description="God comes from the crew too. Anyone you take out sits out but keeps their points."
        players={allPlayers}
        selectedIds={lineup}
        max={MAX_CREW}
        onCreatePlayer={createPlayer}
        onSave={(ids) => {
          setPickerOpen(false);
          // Keep everyone's existing place; newcomers join at the end.
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
          <span className="text-cream">Pick a God.</span> One person narrates and doesn&apos;t play. The app suggests
          whoever has narrated least, so everyone gets a turn.
        </li>
        <li>
          <span className="text-cream">The deal.</span> The phone goes round the players. Each one presses and holds to
          see their role, then passes it on. The mafia see each other. Then the phone goes to God and stays there.
        </li>
        <li>
          <span className="text-cream">Night.</span> Everyone closes their eyes. God reads the script: wakes the mafia
          (they point at a victim — even one of their own, if they dare), the doctor (saves someone), the detective (God
          gives a silent thumbs up if they found mafia). Dead roles still get called, so nobody can tell they&apos;re
          gone.
        </li>
        <li>
          <span className="text-cream">Day.</span> God reveals what happened. The town argues, then votes: God enters
          the hands raised. Whoever gets the most hands is out (or, if the room plays strict, only someone with over
          half the town); a tie at the top and nobody goes.
        </li>
        <li>
          <span className="text-cream">Winning.</span> The town wins when every mafioso is out. The mafia wins once they
          match the town head for head.
        </li>
        <li>
          <span className="text-cream">Points.</span> +1 for every night and every vote you survive. Winning team +
          {WIN_BONUS}; mafia still standing at a mafia win +{MAFIA_ALIVE_BONUS} more. Doctor +{SAVE_POINTS} per save,
          detective +{FIND_POINTS} per mafioso found.
        </li>
      </ol>
    </details>
  );
}
