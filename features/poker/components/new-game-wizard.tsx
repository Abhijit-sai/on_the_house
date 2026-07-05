"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Loader2, Plus, Shuffle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { createPokerGame } from "@/features/poker/actions";
import { savePlayer } from "@/features/players/actions";
import { coinsToMoney } from "@/features/settlement/calculations";
import { defaultGameName, formatCoins, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Seat = {
  playerId: string;
  isHostPlayer: boolean;
  advanceMoney: string;
};

const steps = ["Rules", "Table", "Review"] as const;

export function NewGameWizard({ players }: { players: Player[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(defaultGameName());
  const [location, setLocation] = useState("");
  const [ratioMoney, setRatioMoney] = useState("1000");
  const [ratioCoins, setRatioCoins] = useState("2000");
  const [minBuyInCoins, setMinBuyInCoins] = useState("1000");
  const [maxBuyInCoins, setMaxBuyInCoins] = useState("");
  const [startingCoins, setStartingCoins] = useState("1000");
  const [allowRebuys, setAllowRebuys] = useState(true);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [quickName, setQuickName] = useState("");
  const [quickAddPending, startQuickAdd] = useTransition();

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const ratio = {
    money: Number(ratioMoney) || 0,
    coins: Number(ratioCoins) || 0,
  };

  const minBuyInMoney =
    ratio.money > 0 && ratio.coins > 0 ? coinsToMoney(Number(minBuyInCoins) || 0, ratio.money, ratio.coins) : 0;

  function toggleSeat(playerId: string) {
    setError(null);
    setSeats((current) => {
      if (current.some((seat) => seat.playerId === playerId)) {
        return current.filter((seat) => seat.playerId !== playerId);
      }

      if (current.length >= 9) return current;

      return [...current, { playerId, isHostPlayer: false, advanceMoney: "" }];
    });
  }

  function setHostSeat(playerId: string) {
    setSeats((current) =>
      current.map((seat) => ({ ...seat, isHostPlayer: seat.playerId === playerId ? !seat.isHostPlayer : false })),
    );
  }

  function setAdvance(playerId: string, value: string) {
    setSeats((current) => current.map((seat) => (seat.playerId === playerId ? { ...seat, advanceMoney: value } : seat)));
  }

  function moveSeat(index: number, direction: -1 | 1) {
    setSeats((current) => {
      const target = index + direction;

      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function shuffleSeats() {
    setSeats((current) => {
      const next = [...current];

      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }

      return next;
    });
  }

  function quickAddPlayer() {
    const trimmed = quickName.trim();

    if (!trimmed) return;

    startQuickAdd(async () => {
      const result = await savePlayer({ name: trimmed });

      if (!result.ok) {
        setError(result.message ?? "Could not add player.");
        return;
      }

      setQuickName("");
      router.refresh();
    });
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!name.trim()) return "Give the game a name.";
      if (!(Number(ratioMoney) > 0) || !(Number(ratioCoins) > 0)) return "Set a valid money-to-coin ratio.";
      if (!(Number(minBuyInCoins) > 0)) return "Set a minimum buy-in in coins.";
      if (!(Number(startingCoins) >= Number(minBuyInCoins))) return "Starting stack must be at least the minimum buy-in.";
      if (maxBuyInCoins && Number(maxBuyInCoins) < Number(minBuyInCoins)) return "Max buy-in cannot be below the minimum.";
      return null;
    }

    if (current === 1) {
      if (seats.length < 2) return "Seat at least 2 players.";
      const hasAdvances = seats.some((seat) => Number(seat.advanceMoney) > 0);
      if (hasAdvances && !seats.some((seat) => seat.isHostPlayer)) {
        return "Advances are paid to you — tap the crown on your own seat first.";
      }
      return null;
    }

    return null;
  }

  function goNext() {
    const message = validateStep(step);

    if (message) {
      setError(message);
      return;
    }

    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function create() {
    const message = validateStep(0) ?? validateStep(1);

    if (message) {
      setError(message);
      return;
    }

    startTransition(async () => {
      const result = await createPokerGame({
        name: name.trim(),
        location: location.trim() || undefined,
        ratioMoneyAmount: Number(ratioMoney),
        ratioCoinAmount: Number(ratioCoins),
        minBuyInCoins: Number(minBuyInCoins),
        maxBuyInCoinsPerPlayer: maxBuyInCoins ? Number(maxBuyInCoins) : undefined,
        startingCoinAmount: Number(startingCoins),
        allowRebuys,
        players: seats.map((seat) => ({
          playerId: seat.playerId,
          isHostPlayer: seat.isHostPlayer,
          advanceMoney: Number(seat.advanceMoney) || 0,
        })),
      });

      if (!result.ok || !result.gameId) {
        setError(result.message ?? "Could not create the game.");
        return;
      }

      router.push(`/app/games/${result.gameId}`);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {steps.map((label, index) => (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                index <= step ? "bg-gold-brand" : "bg-elevated",
              )}
            />
            <span className={cn("text-[11px] font-bold", index === step ? "text-gold-brand" : "text-muted")}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="game-name">Game name</Label>
              <Input id="game-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="game-location">Location (optional)</Label>
              <Input
                id="game-location"
                placeholder="Abhijit's place"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-brand" />
              <h2 className="font-bold text-white">Chip economy</h2>
            </div>
            <div className="grid grid-cols-2 items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="ratio-money">Money (₹)</Label>
                <Input
                  id="ratio-money"
                  inputMode="numeric"
                  value={ratioMoney}
                  onChange={(e) => setRatioMoney(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ratio-coins">= Coins</Label>
                <Input
                  id="ratio-coins"
                  inputMode="numeric"
                  value={ratioCoins}
                  onChange={(e) => setRatioCoins(e.target.value)}
                />
              </div>
            </div>
            {ratio.money > 0 && ratio.coins > 0 ? (
              <p className="rounded-2xl bg-gold-tint px-3 py-2 text-sm text-gold-brand">
                {formatMoney(ratio.money)} buys {formatCoins(ratio.coins)} coins
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="min-buy-in">Min buy-in (coins)</Label>
                <Input
                  id="min-buy-in"
                  inputMode="numeric"
                  value={minBuyInCoins}
                  onChange={(e) => setMinBuyInCoins(e.target.value)}
                />
                {minBuyInMoney > 0 ? <p className="text-xs text-muted">= {formatMoney(minBuyInMoney)}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="starting-coins">Starting stack (coins)</Label>
                <Input
                  id="starting-coins"
                  inputMode="numeric"
                  value={startingCoins}
                  onChange={(e) => setStartingCoins(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-buy-in">Max buy-in per player (coins, optional)</Label>
              <Input
                id="max-buy-in"
                inputMode="numeric"
                placeholder="No limit"
                value={maxBuyInCoins}
                onChange={(e) => setMaxBuyInCoins(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between rounded-2xl border border-border bg-elevated px-4 py-3"
              onClick={() => setAllowRebuys((v) => !v)}
            >
              <span className="text-sm font-semibold text-cream">Allow rebuys</span>
              <span
                className={cn(
                  "flex h-6 w-11 items-center rounded-full p-0.5 transition-colors",
                  allowRebuys ? "justify-end bg-success/70" : "justify-start bg-elevated ring-1 ring-border",
                )}
              >
                <span className="h-5 w-5 rounded-full bg-white" />
              </span>
            </button>
          </Card>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Who's playing?</h2>
              <span className="text-xs font-bold text-muted">{seats.length}/9 seated</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map((player) => {
                const seated = seats.some((seat) => seat.playerId === player.id);

                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => toggleSeat(player.id)}
                    className={cn(
                      "flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                      seated
                        ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                        : "border-border bg-elevated text-cream",
                    )}
                  >
                    <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                    {player.name}
                  </button>
                );
              })}
              {players.length === 0 ? (
                <p className="text-sm text-muted">No saved players yet. Add your first one below.</p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Quick add player…"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    quickAddPlayer();
                  }
                }}
              />
              <Button type="button" variant="secondary" size="icon" onClick={quickAddPlayer} disabled={quickAddPending}>
                {quickAddPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              </Button>
            </div>
          </Card>

          {seats.length > 0 ? (
            <Card className="space-y-3">
              <h2 className="font-bold text-white">Seated players</h2>
              <p className="text-xs text-muted">
                Tap the crown to mark your own seat. Record any cash paid to you up front as an advance.
              </p>
              <div className="space-y-2">
                {seats.map((seat) => {
                  const player = playersById.get(seat.playerId);

                  if (!player) return null;

                  return (
                    <div key={seat.playerId} className="chip-pop rounded-2xl border border-border bg-elevated p-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                        <span className="flex-1 text-sm font-bold text-white">{player.name}</span>
                        <button
                          type="button"
                          aria-label={seat.isHostPlayer ? "Unmark as host" : "Mark as your seat"}
                          onClick={() => setHostSeat(seat.playerId)}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full border",
                            seat.isHostPlayer
                              ? "border-gold-brand bg-gold-tint text-gold-brand shadow-glow"
                              : "border-border text-muted",
                          )}
                        >
                          <Crown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Label htmlFor={`advance-${seat.playerId}`} className="shrink-0 text-xs text-muted">
                          Advance ₹
                        </Label>
                        <Input
                          id={`advance-${seat.playerId}`}
                          inputMode="numeric"
                          placeholder="0"
                          className="h-10"
                          value={seat.advanceMoney}
                          onChange={(e) => setAdvance(seat.playerId, e.target.value)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-white">Seating order</h2>
              <Button type="button" variant="secondary" size="sm" onClick={shuffleSeats}>
                <Shuffle className="h-4 w-4" />
                Shuffle
              </Button>
            </div>
            <div className="space-y-2">
              {seats.map((seat, index) => {
                const player = playersById.get(seat.playerId);

                if (!player) return null;

                return (
                  <div key={seat.playerId} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
                    <span className="w-6 text-center text-sm font-black tabular-nums text-gold-brand">{index + 1}</span>
                    <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                    <span className="flex-1 truncate text-sm font-bold text-white">
                      {player.name}
                      {seat.isHostPlayer ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => moveSeat(index, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        aria-label="Move down"
                        disabled={index === seats.length - 1}
                        onClick={() => moveSeat(index, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-2 bg-gold-tint">
            <h2 className="font-bold text-white">{name}</h2>
            <p className="text-sm text-muted">
              {formatMoney(ratio.money)} = {formatCoins(ratio.coins)} coins · Min buy-in {formatCoins(Number(minBuyInCoins) || 0)}{" "}
              coins · {seats.length} players{allowRebuys ? " · Rebuys on" : " · No rebuys"}
            </p>
            {seats.some((seat) => Number(seat.advanceMoney) > 0) ? (
              <p className="text-sm text-gold-brand">
                Advances collected:{" "}
                {formatMoney(seats.reduce((sum, seat) => sum + (Number(seat.advanceMoney) || 0), 0))}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
        ) : null}
        {step < steps.length - 1 ? (
          <Button type="button" className="flex-1" onClick={goNext}>
            Next
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button type="button" className="flex-1" onClick={create} disabled={isPending}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            Create table
          </Button>
        )}
      </div>
    </div>
  );
}
