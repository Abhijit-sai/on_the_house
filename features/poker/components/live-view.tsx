"use client";

import { Coins, Crown, Flag, Loader2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { BuyInPaymentStatus } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { addBuyIn, endGame, pauseGame, removeBuyIn, resumeGame, setAdvance } from "@/features/poker/actions";
import { buyInPresets, seatBuyIns, seatTotals, tableTotals } from "@/features/poker/derive";
import type { GameDetail } from "@/features/poker/queries";
import { moneyToCoins } from "@/features/settlement/calculations";
import { formatCoins, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const paymentStatusOptions: { value: BuyInPaymentStatus; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
  { value: "settled_later", label: "Settle later" },
];

export function LiveView({ detail }: { detail: GameDetail }) {
  const { game, config, seats, buyIns } = detail;
  const paused = game.status === "paused";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [buyInSheetOpen, setBuyInSheetOpen] = useState(false);
  const [buyInSeatId, setBuyInSeatId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<BuyInPaymentStatus>("paid");

  const [seatSheetId, setSeatSheetId] = useState<string | null>(null);
  const [advanceDraft, setAdvanceDraft] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  const totals = useMemo(() => tableTotals(buyIns), [buyIns]);
  const presets = useMemo(() => buyInPresets(config), [config]);
  const seatSheet = seats.find((seat) => seat.id === seatSheetId) ?? null;

  const amountNumber = Number(amount) || 0;
  const amountCoins =
    amountNumber > 0 ? moneyToCoins(amountNumber, config.ratio_money_amount, config.ratio_coin_amount) : 0;
  const amountIsWhole =
    amountNumber > 0 && Number.isInteger((amountNumber * config.ratio_coin_amount) / config.ratio_money_amount);

  function openBuyInSheet(seatId?: string) {
    setError(null);
    setBuyInSeatId(seatId ?? null);
    setAmount(String(presets[0] ?? ""));
    setPaymentStatus("paid");
    setBuyInSheetOpen(true);
  }

  function submitBuyIn() {
    if (!buyInSeatId) {
      setError("Pick who is buying in.");
      return;
    }

    startTransition(async () => {
      const result = await addBuyIn({
        gameId: game.id,
        gamePlayerId: buyInSeatId,
        moneyAmount: amountNumber,
        paymentStatus,
      });

      if (!result.ok) {
        setError(result.message ?? "Could not add the buy-in.");
        return;
      }

      setBuyInSheetOpen(false);
    });
  }

  function reverseBuyIn(buyInId: string) {
    startTransition(async () => {
      const result = await removeBuyIn({ gameId: game.id, buyInId, reason: "Reversed by host during game" });

      if (!result.ok) setError(result.message ?? "Could not reverse the buy-in.");
    });
  }

  function saveAdvance() {
    if (!seatSheet) return;

    startTransition(async () => {
      const result = await setAdvance({
        gameId: game.id,
        gamePlayerId: seatSheet.id,
        advanceMoney: Number(advanceDraft) || 0,
      });

      if (!result.ok) setError(result.message ?? "Could not update the advance.");
    });
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) setError(result.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-5">
      <Card className={cn("space-y-1 bg-gold-tint", !paused && "shadow-glow")} key={totals.count}>
        <div className="chip-pop flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">On the table</p>
            <p className="text-3xl font-black tabular-nums text-white">{formatMoney(totals.money)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Coins out</p>
            <p className="text-xl font-black tabular-nums text-gold-brand">{formatCoins(totals.coins)}</p>
          </div>
        </div>
        <p className="text-xs text-muted">
          {totals.count} buy-in{totals.count === 1 ? "" : "s"} · {seats.length} players
        </p>
      </Card>

      {paused ? (
        <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-center text-sm font-semibold text-warning">
          Game paused — resume to keep dealing buy-ins.
        </p>
      ) : null}

      <div className="space-y-2">
        {seats.map((seat) => {
          const totalsForSeat = seatTotals(seat.id, buyIns);

          return (
            <button
              key={seat.id}
              type="button"
              className="w-full rounded-[20px] border border-border bg-elevated p-4 text-left transition active:scale-[0.99]"
              onClick={() => {
                setSeatSheetId(seat.id);
                setAdvanceDraft(seat.advance_money > 0 ? String(seat.advance_money) : "");
                setError(null);
              }}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">
                    {seat.player.name}
                    {seat.is_host_player ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                  </p>
                  <p className="text-xs text-muted">
                    {totalsForSeat.count} buy-in{totalsForSeat.count === 1 ? "" : "s"}
                    {seat.advance_money > 0 ? ` · Adv ${formatMoney(seat.advance_money)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black tabular-nums text-white">{formatMoney(totalsForSeat.money)}</p>
                  <p className="text-xs tabular-nums text-gold-brand">{formatCoins(totalsForSeat.coins)} coins</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {error && !buyInSheetOpen && !seatSheetId ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={isPending}
          onClick={() => run(() => (paused ? resumeGame(game.id) : pauseGame(game.id)))}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" className="flex-1 border-red-danger/40 text-red-danger" onClick={() => setConfirmEnd(true)}>
          <Flag className="h-4 w-4" />
          End game
        </Button>
      </div>

      <div className="sticky bottom-20 z-10 -mx-2 rounded-[24px] border border-border bg-background/95 p-3 shadow-[0_-12px_32px_rgba(0,0,0,0.55)] backdrop-blur">
        <Button
          className="h-14 w-full text-base shadow-glow"
          size="lg"
          disabled={paused}
          onClick={() => openBuyInSheet()}
        >
          <Plus className="h-5 w-5" />
          Add buy-in
        </Button>
      </div>

      <BottomSheet open={buyInSheetOpen} onClose={() => setBuyInSheetOpen(false)} title="Add buy-in">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Who is buying in?</Label>
            <div className="flex flex-wrap gap-2">
              {seats.map((seat) => (
                <button
                  key={seat.id}
                  type="button"
                  onClick={() => setBuyInSeatId(seat.id)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                    buyInSeatId === seat.id
                      ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                      : "border-border bg-elevated text-cream",
                  )}
                >
                  <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
                  {seat.player.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buy-in-amount">Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={cn(
                    "min-h-11 rounded-2xl border px-2 py-2 text-sm font-black tabular-nums",
                    Number(amount) === preset
                      ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                      : "border-border bg-elevated text-cream",
                  )}
                >
                  {formatMoney(preset)}
                </button>
              ))}
            </div>
            <Input
              id="buy-in-amount"
              inputMode="numeric"
              placeholder="Custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {amountNumber > 0 ? (
              <p className={cn("flex items-center gap-1.5 text-sm", amountIsWhole ? "text-gold-brand" : "text-red-danger")}>
                <Coins className="h-4 w-4" />
                {amountIsWhole
                  ? `${formatCoins(amountCoins)} coins`
                  : "Doesn't convert to whole coins — adjust the amount."}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Payment</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentStatusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentStatus(option.value)}
                  className={cn(
                    "min-h-11 rounded-2xl border px-2 py-2 text-xs font-bold",
                    paymentStatus === option.value
                      ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                      : "border-border bg-elevated text-cream",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
          ) : null}

          <Button className="h-13 w-full" disabled={isPending || !amountIsWhole || !buyInSeatId} onClick={submitBuyIn}>
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            Add {amountNumber > 0 ? formatMoney(amountNumber) : "buy-in"}
          </Button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={seatSheet !== null}
        onClose={() => setSeatSheetId(null)}
        title={seatSheet?.player.name ?? ""}
      >
        {seatSheet ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buy-ins</Label>
              {seatBuyIns(seatSheet.id, buyIns).length === 0 ? (
                <p className="text-sm text-muted">No buy-ins yet.</p>
              ) : (
                <div className="space-y-2">
                  {seatBuyIns(seatSheet.id, buyIns).map((buyIn) => (
                    <div key={buyIn.id} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
                      <div className="flex-1">
                        <p className="font-bold tabular-nums text-white">{formatMoney(buyIn.money_amount)}</p>
                        <p className="text-xs text-muted">
                          {formatCoins(buyIn.coin_amount)} coins ·{" "}
                          {paymentStatusOptions.find((o) => o.value === buyIn.payment_status)?.label}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-danger"
                        aria-label="Reverse buy-in"
                        disabled={isPending}
                        onClick={() => reverseBuyIn(buyIn.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="advance-edit">Advance paid to you (₹)</Label>
              <div className="flex gap-2">
                <Input
                  id="advance-edit"
                  inputMode="numeric"
                  placeholder="0"
                  value={advanceDraft}
                  onChange={(e) => setAdvanceDraft(e.target.value)}
                />
                <Button variant="secondary" disabled={isPending} onClick={saveAdvance}>
                  Save
                </Button>
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
            ) : null}

            <Button
              className="w-full"
              disabled={paused}
              onClick={() => {
                setSeatSheetId(null);
                openBuyInSheet(seatSheet.id);
              }}
            >
              <Plus className="h-5 w-5" />
              Buy-in for {seatSheet.player.name}
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End the game?">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Make sure every buy-in is recorded before ending. The table currently shows{" "}
            <span className="font-bold text-white">{formatMoney(totals.money)}</span> across{" "}
            <span className="font-bold text-white">{totals.count}</span> buy-in{totals.count === 1 ? "" : "s"} (
            {formatCoins(totals.coins)} coins issued).
          </p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              setConfirmEnd(false);
              run(() => endGame(game.id));
            }}
          >
            <Flag className="h-4 w-4" />
            All buy-ins recorded — end game
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmEnd(false)}>
            Keep playing
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
