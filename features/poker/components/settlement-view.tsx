"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Crown,
  IndianRupee,
  Loader2,
  PartyPopper,
  QrCode,
  Smartphone,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { SettlementLine } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { QrSheet } from "@/components/shared/qr-sheet";
import { closeGame, recordLinePayment, reopenTally } from "@/features/poker/actions";
import { updatePlayerUpi } from "@/features/players/actions";
import type { GameDetail, SeatedPlayer } from "@/features/poker/queries";
import { roundMoney } from "@/features/settlement/calculations";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { upiLink } from "@/lib/upi";
import { cn } from "@/lib/utils";

export function SettlementView({ detail }: { detail: GameDetail }) {
  const { game, seats, tallies, batch } = detail;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [partialLine, setPartialLine] = useState<SettlementLine | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [qrLine, setQrLine] = useState<{ upiUri: string; payeeName: string; amount: number } | null>(null);
  const [upiEditSeat, setUpiEditSeat] = useState<SeatedPlayer | null>(null);
  const [upiDraft, setUpiDraft] = useState("");

  const seatsById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);
  const lines = batch?.lines ?? [];

  const standings = useMemo(
    () =>
      [...tallies]
        .map((tally) => ({ tally, seat: seatsById.get(tally.game_player_id) ?? null }))
        .filter((entry): entry is { tally: (typeof tallies)[number]; seat: SeatedPlayer } => entry.seat !== null)
        .sort((a, b) => b.tally.net_result_money - a.tally.net_result_money),
    [tallies, seatsById],
  );

  const pendingTotal = roundMoney(lines.reduce((sum, line) => sum + (line.amount - line.paid_amount), 0));
  const allPaid = lines.every((line) => line.status === "paid");

  function markPaid(line: SettlementLine, amount: number) {
    setError(null);
    startTransition(async () => {
      const result = await recordLinePayment({ gameId: game.id, lineId: line.id, paidAmount: amount });

      if (!result.ok) setError(result.message ?? "Could not record the payment.");
    });
  }

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy. Long-press to copy manually.");
    }
  }

  return (
    <div className="space-y-5">
      <Card
        key={allPaid ? "settled" : "pending"}
        className={cn("space-y-1", allPaid ? "chip-pop border-success/50 shadow-glow" : "bg-gold-tint")}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {allPaid ? "All settled" : "Left to settle"}
        </p>
        <p className={cn("text-3xl font-black tabular-nums", allPaid ? "text-success" : "text-white")}>
          {allPaid ? "Done! 🎉" : formatMoney(pendingTotal)}
        </p>
        <p className="text-xs text-muted">
          {lines.filter((l) => l.status === "paid").length}/{lines.length} payments completed
          {batch ? ` · ${batch.mode === "host" ? "through the host" : "player to player"}` : ""}
        </p>
      </Card>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-gold-brand" />
          <h2 className="font-bold text-white">Final standings</h2>
        </div>
        {standings.map(({ tally, seat }, index) => (
          <div key={tally.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
            <span className="w-6 text-center text-sm font-black tabular-nums text-muted">{index + 1}</span>
            <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {seat.player.name}
                {seat.is_host_player ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
              </p>
              <p className="text-xs text-muted">
                In {formatMoney(tally.total_buy_in_money)} · out {formatMoney(tally.final_value_money)}
                {seat.advance_money > 0 ? ` · adv ${formatMoney(seat.advance_money)}` : ""}
              </p>
            </div>
            <p
              className={cn(
                "font-black tabular-nums",
                tally.net_result_money > 0 ? "text-success" : tally.net_result_money < 0 ? "text-red-danger" : "text-muted",
              )}
            >
              {formatSignedMoney(tally.net_result_money)}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-gold-brand" />
          <h2 className="font-bold text-white">Who pays whom</h2>
        </div>
        {lines.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Everyone broke even — nothing to settle. Close the game whenever.</p>
          </Card>
        ) : null}
        {lines.map((line) => {
          const from = seatsById.get(line.from_game_player_id);
          const to = seatsById.get(line.to_game_player_id);

          if (!from || !to) return null;

          const remaining = roundMoney(line.amount - line.paid_amount);
          const paid = line.status === "paid";
          const receiverUpi = to.player.upi_id;

          return (
            <Card key={line.id} className={cn("space-y-3", paid && "opacity-70")}>
              <div className="flex items-center gap-2">
                <PlayerAvatar name={from.player.name} colorKey={from.player.color_key} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{from.player.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gold-brand" />
                <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-white">{to.player.name}</span>
                <PlayerAvatar name={to.player.name} colorKey={to.player.color_key} size="sm" />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-black tabular-nums text-white">{formatMoney(line.amount)}</p>
                {paid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                    <Check className="h-3.5 w-3.5" />
                    Paid
                  </span>
                ) : line.status === "partially_paid" ? (
                  <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
                    {formatMoney(remaining)} left
                  </span>
                ) : (
                  <span className="rounded-full bg-elevated px-3 py-1 text-xs font-bold text-muted">Pending</span>
                )}
              </div>

              {!paid ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={isPending} onClick={() => markPaid(line, line.amount)}>
                    <Check className="h-4 w-4" />
                    Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      setPartialLine(line);
                      setPartialAmount(line.paid_amount > 0 ? String(line.paid_amount) : "");
                    }}
                  >
                    Partial…
                  </Button>
                  {receiverUpi ? (
                    <>
                      <Button size="sm" variant="secondary" asChild>
                        <a href={upiLink(receiverUpi, to.player.name, remaining, game.name)}>
                          <Smartphone className="h-4 w-4" />
                          UPI
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setQrLine({
                            upiUri: upiLink(receiverUpi, to.player.name, remaining, game.name),
                            payeeName: to.player.name,
                            amount: remaining,
                          })
                        }
                      >
                        <QrCode className="h-4 w-4" />
                        QR
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyText(receiverUpi, `upi-${line.id}`)}
                      >
                        <Copy className="h-4 w-4" />
                        {copied === `upi-${line.id}` ? "Copied!" : "Copy UPI"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyText(String(remaining), `amt-${line.id}`)}
                      >
                        <Copy className="h-4 w-4" />
                        {copied === `amt-${line.id}` ? "Copied!" : "Copy amount"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setUpiEditSeat(to);
                          setUpiDraft("");
                        }}
                      >
                        Add UPI for {to.player.name}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <div className="sticky bottom-24 z-10 space-y-2">
        <Button
          className="h-14 w-full text-base shadow-glow"
          disabled={!allPaid || isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await closeGame(game.id);

              if (!result.ok) setError(result.message ?? "Could not close the game.");
            })
          }
        >
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PartyPopper className="h-5 w-5" />}
          {allPaid ? "Close the night" : "Close after all payments"}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await reopenTally(game.id);

              if (!result.ok) setError(result.message ?? "Could not reopen the tally.");
            })
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Re-count chips
        </Button>
      </div>

      <BottomSheet open={partialLine !== null} onClose={() => setPartialLine(null)} title="Record partial payment">
        {partialLine ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {seatsById.get(partialLine.from_game_player_id)?.player.name} owes{" "}
              <span className="font-bold text-white">{formatMoney(partialLine.amount)}</span> in total.
            </p>
            <div className="space-y-2">
              <Label htmlFor="partial-amount">Total paid so far (₹)</Label>
              <Input
                id="partial-amount"
                inputMode="numeric"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => {
                const line = partialLine;
                setPartialLine(null);
                markPaid(line, Number(partialAmount) || 0);
              }}
            >
              Save payment
            </Button>
          </div>
        ) : null}
      </BottomSheet>

      <QrSheet
        open={qrLine !== null}
        onClose={() => setQrLine(null)}
        upiUri={qrLine?.upiUri ?? ""}
        payeeName={qrLine?.payeeName ?? ""}
        amount={qrLine?.amount ?? 0}
      />

      <BottomSheet
        open={upiEditSeat !== null}
        onClose={() => setUpiEditSeat(null)}
        title={`UPI for ${upiEditSeat?.player.name ?? ""}`}
      >
        {upiEditSeat ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi-edit">UPI ID</Label>
              <Input
                id="upi-edit"
                placeholder="name@bank"
                value={upiDraft}
                onChange={(e) => setUpiDraft(e.target.value)}
              />
              <p className="text-xs text-muted">Saved to their profile — every future settlement gets the shortcut too.</p>
            </div>
            <Button
              className="w-full"
              disabled={isPending}
              onClick={() => {
                const seat = upiEditSeat;
                setUpiEditSeat(null);
                startTransition(async () => {
                  const result = await updatePlayerUpi({ playerId: seat.player.id, upiId: upiDraft });

                  if (!result.ok) {
                    setError(result.message ?? "Could not save the UPI ID.");
                    return;
                  }

                  router.refresh();
                });
              }}
            >
              Save UPI ID
            </Button>
          </div>
        ) : null}
      </BottomSheet>
    </div>
  );
}
