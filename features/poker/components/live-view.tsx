"use client";

import { Check, Coins, Crown, Flag, Loader2, Minus, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { BuyInPaymentStatus } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import {
  addBuyIn,
  endGame,
  pauseGame,
  removeBuyIn,
  resumeGame,
  setAdvance,
  setBuyInPayment,
} from "@/features/poker/actions";
import { ClaimSeatCard } from "@/features/poker/components/claim-seat-card";
import { buyInPresets, seatBuyIns, seatTotals, tableTotals } from "@/features/poker/derive";
import type { GameDetail } from "@/features/poker/queries";
import { moneyToCoins } from "@/features/settlement/calculations";
import { formatCoins, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const paymentStatusOptions: { value: BuyInPaymentStatus; label: string }[] = [
  { value: "paid", label: "Cash with you" },
  { value: "unpaid", label: "Not collected" },
  { value: "settled_later", label: "Settle later" },
];

export function LiveView({ detail }: { detail: GameDetail }) {
  const { game, config, seats, buyIns } = detail;
  const paused = game.status === "paused";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [buyInSheetOpen, setBuyInSheetOpen] = useState(false);
  const [roundSeatIds, setRoundSeatIds] = useState<string[]>([]);
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<BuyInPaymentStatus>("unpaid");

  const [seatSheetId, setSeatSheetId] = useState<string | null>(null);
  const [advanceDraft, setAdvanceDraft] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);

  const totals = useMemo(() => tableTotals(buyIns), [buyIns]);
  const presets = useMemo(() => buyInPresets(config), [config]);
  const seatSheet = seats.find((seat) => seat.id === seatSheetId) ?? null;
  const focusedSeat = seats.find((seat) => seat.id === focusedSeatId) ?? null;

  const amountNumber = Number(amount) || 0;
  const amountCoins =
    amountNumber > 0 ? moneyToCoins(amountNumber, config.ratio_money_amount, config.ratio_coin_amount) : 0;
  const amountIsWhole =
    amountNumber > 0 && Number.isInteger((amountNumber * config.ratio_coin_amount) / config.ratio_money_amount);

  function openBuyInSheet(seatId?: string) {
    setError(null);
    setFocusedSeatId(seatId ?? null);

    if (seatId) {
      setRoundSeatIds([seatId]);
    } else {
      // Opening round: everyone who hasn't bought in yet, else the whole table.
      const withoutChips = seats.filter((s) => seatTotals(s.id, buyIns).count === 0).map((s) => s.id);
      setRoundSeatIds(withoutChips.length > 0 ? withoutChips : []);
    }

    setAmount(String(presets[0] ?? ""));
    setBuyInSheetOpen(true);
  }

  /** Nudge the amount by one minimum buy-in, never below one. */
  function stepAmount(direction: -1 | 1) {
    const step = presets[0] || 1;
    const next = Math.max(step, (Number(amount) || 0) + direction * step);
    setAmount(String(next));
  }

  function toggleRoundSeat(seatId: string) {
    setRoundSeatIds((current) =>
      current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId],
    );
  }

  function submitBuyIn() {
    if (roundSeatIds.length === 0) {
      setError("Pick who is buying in.");
      return;
    }

    startTransition(async () => {
      const result = await addBuyIn({
        gameId: game.id,
        gamePlayerIds: roundSeatIds,
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

  function togglePayment(buyInId: string, next: BuyInPaymentStatus) {
    startTransition(async () => {
      const result = await setBuyInPayment({ gameId: game.id, buyInId, paymentStatus: next });

      if (!result.ok) setError(result.message ?? "Could not update the payment.");
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

      <ClaimSeatCard gameId={game.id} seats={seats} />

      <div className="space-y-2">
        {seats.map((seat) => {
          const totalsForSeat = seatTotals(seat.id, buyIns);

          return (
            <div
              key={seat.id}
              role="button"
              tabIndex={0}
              className="w-full cursor-pointer rounded-[20px] border border-border bg-elevated p-4 text-left transition active:scale-[0.99]"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSeatSheetId(seat.id);
                  setAdvanceDraft(seat.advance_money > 0 ? String(seat.advance_money) : "");
                }
              }}
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
                    {seat.advance_money > 0 ? ` · ${formatMoney(seat.advance_money)} with you` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black tabular-nums text-white">{formatMoney(totalsForSeat.money)}</p>
                  <p className="text-xs tabular-nums text-gold-brand">{formatCoins(totalsForSeat.coins)} coins</p>
                </div>
                <button
                  type="button"
                  aria-label={`Add a buy-in for ${seat.player.name}`}
                  disabled={paused || isPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    openBuyInSheet(seat.id);
                  }}
                  className="flex h-11 shrink-0 items-center gap-0.5 rounded-2xl border border-gold-brand/40 bg-gold-tint px-2.5 text-sm font-black text-gold-brand disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Buy-in
                </button>
              </div>
            </div>
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
          Buy-in round
        </Button>
      </div>

      <BottomSheet
        open={buyInSheetOpen}
        onClose={() => setBuyInSheetOpen(false)}
        title={focusedSeat ? `Buy-in \u00b7 ${focusedSeat.player.name}` : "Buy-in round"}
      >
        <div className="space-y-4">
          {focusedSeat ? null : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Who is buying in?</Label>
                <button
                  type="button"
                  className="text-xs font-bold text-gold-brand"
                  onClick={() => setRoundSeatIds(roundSeatIds.length === seats.length ? [] : seats.map((s) => s.id))}
                >
                  {roundSeatIds.length === seats.length ? "Clear all" : "Everyone"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {seats.map((seat) => {
                  const selected = roundSeatIds.includes(seat.id);

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      onClick={() => toggleRoundSeat(seat.id)}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                        selected
                          ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                          : "border-border bg-elevated text-cream",
                      )}
                    >
                      <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
                      {seat.player.name}
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">Everyone selected gets the same amount.</p>
            </div>
          )}

          {/* amount stepper */}
          <div className="space-y-2">
            <Label htmlFor="buy-in-amount">How much?</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-14 w-14 shrink-0 text-xl"
                aria-label="Decrease amount"
                disabled={amountNumber <= (presets[0] || 1)}
                onClick={() => stepAmount(-1)}
              >
                <Minus className="h-6 w-6" />
              </Button>
              <Input
                id="buy-in-amount"
                inputMode="numeric"
                placeholder="0"
                className="h-14 flex-1 text-center text-2xl font-black tabular-nums"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-14 w-14 shrink-0 text-xl"
                aria-label="Increase amount"
                onClick={() => stepAmount(1)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={cn(
                    "min-h-10 rounded-2xl border px-2 py-2 text-sm font-black tabular-nums",
                    Number(amount) === preset
                      ? "border-gold-brand/60 bg-gold-tint text-gold-brand"
                      : "border-border bg-elevated text-cream",
                  )}
                >
                  {formatMoney(preset)}
                </button>
              ))}
            </div>
          </div>

          {/* payment */}
          <div className="space-y-2">
            <Label>Did they hand over the cash?</Label>
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

          {/* summary */}
          <div className="space-y-1.5 rounded-2xl border border-border bg-elevated p-3">
            {amountNumber > 0 && !amountIsWhole ? (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-red-danger">
                <Coins className="h-4 w-4" />
                {formatMoney(amountNumber)} doesn&apos;t convert to whole coins — adjust it.
              </p>
            ) : (
              <>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted">{focusedSeat ? "Buy-in" : `${roundSeatIds.length} \u00d7 ${formatMoney(amountNumber)}`}</span>
                  <span className="font-black tabular-nums text-white">
                    {formatMoney(amountNumber * (focusedSeat ? 1 : roundSeatIds.length))}
                  </span>
                </p>
                <p className="flex items-center justify-between text-sm">
                  <span className="text-muted">Chips issued</span>
                  <span className="font-bold tabular-nums text-gold-brand">
                    {formatCoins(amountCoins * (focusedSeat ? 1 : roundSeatIds.length))} coins
                  </span>
                </p>
                {focusedSeat ? (
                  <p className="flex items-center justify-between border-t border-border pt-1.5 text-sm">
                    <span className="text-muted">{focusedSeat.player.name}&apos;s total after this</span>
                    <span className="font-black tabular-nums text-white">
                      {formatMoney(seatTotals(focusedSeat.id, buyIns).money + amountNumber)}
                    </span>
                  </p>
                ) : null}
                <p className="pt-0.5 text-xs text-muted">
                  {paymentStatus === "paid"
                    ? "Cash is with you \u2014 netted off what they owe at settlement."
                    : "Nothing collected \u2014 the full amount rides on the final settlement."}
                </p>
              </>
            )}
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
          ) : null}

          <Button
            className="h-13 w-full"
            disabled={isPending || !amountIsWhole || roundSeatIds.length === 0}
            onClick={submitBuyIn}
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
            {focusedSeat
              ? `Add ${formatMoney(amountNumber)} to ${focusedSeat.player.name}`
              : `Confirm ${roundSeatIds.length} buy-in${roundSeatIds.length === 1 ? "" : "s"}`}
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
                        <p className="text-xs text-muted">{formatCoins(buyIn.coin_amount)} coins</p>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            togglePayment(buyIn.id, buyIn.payment_status === "paid" ? "unpaid" : "paid")
                          }
                          className={cn(
                            "mt-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                            buyIn.payment_status === "paid"
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-border bg-elevated text-muted",
                          )}
                        >
                          {buyIn.payment_status === "paid" ? "Cash with you" : "Not collected"}
                        </button>
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
              <Label htmlFor="advance-edit">Cash with you (₹)</Label>
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
              <p className="text-xs leading-5 text-muted">
                Money they handed you outside of buy-ins — no chips issued. It's netted off what they owe at
                settlement.
              </p>
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
