"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crown, Loader2, Shuffle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { PlayerPicker, type CreatePlayerResult, type PickerPlayer } from "@/components/shared/player-picker";
import { createPokerGame } from "@/features/poker/actions";
import { savePlayer } from "@/features/players/actions";

import { defaultGameName, formatCoins, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Seat = {
  playerId: string;
  isHostPlayer: boolean;
  advanceMoney: string;
};

const steps = ["Rules", "Table", "Review"] as const;

export function NewGameWizard({ players, hostName }: { players: Player[]; hostName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(defaultGameName());
  const [location, setLocation] = useState("");
  const [ratioMoney, setRatioMoney] = useState("1000");
  const [ratioCoins, setRatioCoins] = useState("2000");
  const [minBuyIn, setMinBuyIn] = useState("1000");
  const [maxBuyIn, setMaxBuyIn] = useState("");
  const [allowRebuys, setAllowRebuys] = useState(true);

  const [seats, setSeats] = useState<Seat[]>([]);
  // Most seats never hand over cash, so the field stays folded until asked for.
  const [cashOpen, setCashOpen] = useState<Set<string>>(new Set());
  // Players created from the picker render immediately, ahead of the refresh.
  const [extraPlayers, setExtraPlayers] = useState<PickerPlayer[]>([]);

  const allPlayers = useMemo(() => {
    const known = new Set(players.map((p) => p.id));
    return [...extraPlayers.filter((p) => !known.has(p.id)), ...players];
  }, [players, extraPlayers]);

  const playersById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  const ratio = {
    money: Number(ratioMoney) || 0,
    coins: Number(ratioCoins) || 0,
  };

  // Hosts think in money ("minimum buy-in is Rs1,000"), so that's what we ask
  // for; coins are derived from the ratio.
  const toCoins = (money: number) =>
    ratio.money > 0 && ratio.coins > 0 ? (money * ratio.coins) / ratio.money : 0;

  const minBuyInCoins = toCoins(Number(minBuyIn) || 0);
  const maxBuyInCoins = maxBuyIn ? toCoins(Number(maxBuyIn)) : null;
  const minConvertsCleanly = Number(minBuyIn) > 0 && Number.isInteger(minBuyInCoins);

  /** Apply the picker's selection, keeping seat order and details for anyone already seated. */
  function setSeatedPlayers(ids: string[]) {
    setError(null);
    setSeats((current) => {
      const kept = current.filter((seat) => ids.includes(seat.playerId));
      let hostTaken = kept.some((seat) => seat.isHostPlayer);

      const added = ids
        .filter((id) => !current.some((seat) => seat.playerId === id))
        .slice(0, Math.max(9 - kept.length, 0))
        .map((id) => {
          // Auto-crown the player carrying the host's own name, so the seat is
          // never silently missed (it gates host settlement and cash with you).
          const player = playersById.get(id);
          const isMe =
            !hostTaken &&
            Boolean(hostName) &&
            Boolean(player) &&
            player!.name.trim().toLowerCase() === hostName!.trim().toLowerCase();

          if (isMe) hostTaken = true;

          return { playerId: id, isHostPlayer: isMe, advanceMoney: "" };
        });

      return [...kept, ...added];
    });
  }

  async function createPlayer(playerName: string): Promise<CreatePlayerResult> {
    const result = await savePlayer({ name: playerName });

    if (result.ok && result.player) {
      const created = result.player;
      setExtraPlayers((current) => [created, ...current]);
      router.refresh();
    }

    return result;
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

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!name.trim()) return "Give the game a name.";
      if (!(Number(ratioMoney) > 0) || !(Number(ratioCoins) > 0)) return "Set a valid money-to-coin ratio.";
      if (!(Number(minBuyIn) > 0)) return "Set a minimum buy-in.";
      if (!minConvertsCleanly) return "That minimum buy-in doesn't convert to whole coins. Adjust it or the ratio.";
      if (maxBuyIn && Number(maxBuyIn) < Number(minBuyIn)) return "Max buy-in cannot be below the minimum.";
      if (maxBuyIn && !Number.isInteger(maxBuyInCoins ?? 0)) return "That max buy-in doesn't convert to whole coins.";
      return null;
    }

    if (current === 1) {
      if (seats.length < 2) return "Seat at least 2 players.";
      const hasAdvances = seats.some((seat) => Number(seat.advanceMoney) > 0);
      if (hasAdvances && !seats.some((seat) => seat.isHostPlayer)) {
        return "That cash is held by you — tap the crown on your own seat first.";
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
        minBuyInCoins,
        maxBuyInCoinsPerPlayer: maxBuyInCoins ?? undefined,
        startingCoinAmount: minBuyInCoins,
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
                <Label htmlFor="min-buy-in">Min buy-in (₹)</Label>
                <Input id="min-buy-in" inputMode="numeric" value={minBuyIn} onChange={(e) => setMinBuyIn(e.target.value)} />
                {Number(minBuyIn) > 0 ? (
                  <p className={cn("text-xs", minConvertsCleanly ? "text-muted" : "text-red-danger")}>
                    {minConvertsCleanly
                      ? `= ${formatCoins(minBuyInCoins)} coins`
                      : "Doesn't make whole coins"}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-buy-in">Max per player (₹, optional)</Label>
                <Input
                  id="max-buy-in"
                  inputMode="numeric"
                  placeholder="No limit"
                  value={maxBuyIn}
                  onChange={(e) => setMaxBuyIn(e.target.value)}
                />
                {maxBuyInCoins ? <p className="text-xs text-muted">= {formatCoins(maxBuyInCoins)} coins</p> : null}
              </div>
            </div>
            <p className="text-xs leading-5 text-muted">
              The minimum buy-in is the default one-tap amount at the table — most nights everyone buys in at
              this, and you can always enter a custom amount.
            </p>
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
          <Card>
            <PlayerPicker
              label="Who's playing?"
              players={allPlayers}
              selectedIds={seats.map((seat) => seat.playerId)}
              onChange={setSeatedPlayers}
              onCreatePlayer={createPlayer}
              max={9}
            />
          </Card>

          {seats.length > 0 ? (
            <Card className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-bold text-white">Seated</h2>
                <p className="text-[11px] text-muted">
                  <Crown className="mb-0.5 mr-0.5 inline h-3 w-3" /> = you · ₹ = cash they gave you up front
                </p>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
                {seats.map((seat) => {
                  const player = playersById.get(seat.playerId);

                  if (!player) return null;

                  const showCash = cashOpen.has(seat.playerId) || seat.advanceMoney !== "";

                  return (
                    <div key={seat.playerId} className="flex min-h-12 items-center gap-2 px-3 py-1.5">
                      <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{player.name}</span>
                      {showCash ? (
                        <div className="relative w-24 shrink-0">
                          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
                          <Input
                            id={`advance-${seat.playerId}`}
                            aria-label={`Cash ${player.name} handed you up front`}
                            inputMode="numeric"
                            placeholder="0"
                            autoFocus={seat.advanceMoney === ""}
                            className="h-9 pl-6 text-right text-sm tabular-nums"
                            value={seat.advanceMoney}
                            onChange={(e) => setAdvance(seat.playerId, e.target.value)}
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Record cash ${player.name} handed you up front`}
                          onClick={() => setCashOpen((current) => new Set(current).add(seat.playerId))}
                          className="flex h-9 shrink-0 items-center rounded-full border border-border px-2.5 text-xs font-bold text-muted"
                        >
                          + ₹
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={seat.isHostPlayer ? "Unmark as your seat" : "Mark as your seat"}
                        aria-pressed={seat.isHostPlayer}
                        onClick={() => setHostSeat(seat.playerId)}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                          seat.isHostPlayer
                            ? "border-gold-brand bg-gold-tint text-gold-brand"
                            : "border-border text-muted",
                        )}
                      >
                        <Crown className="h-4 w-4" />
                      </button>
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
              {formatMoney(ratio.money)} = {formatCoins(ratio.coins)} coins · Min buy-in{" "}
              {formatMoney(Number(minBuyIn) || 0)} · {seats.length} players
              {allowRebuys ? " · Rebuys on" : " · No rebuys"}
            </p>
            {seats.some((seat) => Number(seat.advanceMoney) > 0) ? (
              <p className="text-sm text-gold-brand">
                Cash already with you:{" "}
                {formatMoney(seats.reduce((sum, seat) => sum + (Number(seat.advanceMoney) || 0), 0))}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      {seats.length > 0 && !seats.some((seat) => seat.isHostPlayer) ? (
        <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          No seat is marked as you — tap the crown on your own seat. Without it you can't hold cash for players or
          settle through yourself as the bank. You can also claim your seat later.
        </p>
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
