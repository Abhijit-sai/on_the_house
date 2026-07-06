"use client";

import { ArrowRight, Check, Copy, Crown, QrCode, Smartphone, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { QrSheet } from "@/components/shared/qr-sheet";
import { StatusBadge } from "@/features/poker/components/status-badge";
import type { PublicGameDetail, PublicSeat } from "@/features/poker/public-queries";
import { roundMoney } from "@/features/settlement/calculations";
import { formatCoins, formatMoney, formatSignedMoney } from "@/lib/format";
import { upiLink } from "@/lib/upi";
import { cn } from "@/lib/utils";

export function PublicGameView({ detail }: { detail: PublicGameDetail }) {
  const { game, config, seats, buyIns, tallies, lines } = detail;
  const [copied, setCopied] = useState<string | null>(null);
  const [qrLine, setQrLine] = useState<{ upiUri: string; payeeName: string; amount: number } | null>(null);

  const seatsById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);

  const totals = useMemo(
    () => ({
      money: roundMoney(buyIns.reduce((sum, b) => sum + b.money_amount, 0)),
      coins: buyIns.reduce((sum, b) => sum + b.coin_amount, 0),
      count: buyIns.length,
    }),
    [buyIns],
  );

  const standings = useMemo(
    () =>
      [...tallies]
        .map((tally) => ({ tally, seat: seatsById.get(tally.game_player_id) ?? null }))
        .filter((entry): entry is { tally: (typeof tallies)[number]; seat: PublicSeat } => entry.seat !== null)
        .sort((a, b) => b.tally.net_result_money - a.tally.net_result_money),
    [tallies, seatsById],
  );

  const winner = standings[0];
  const showLive = game.status === "live" || game.status === "paused";
  const showStandings = standings.length > 0;
  const showLines = lines.length > 0 && (game.status === "pending_settlement" || game.status === "closed");

  async function copyText(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable — the value is visible on screen as fallback.
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md space-y-5 px-4 pb-10 pt-6 text-cream lg:max-w-2xl">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-brand">On the House</p>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-black text-white">{game.name}</h1>
          <StatusBadge status={game.status} />
        </div>
        <p className="text-xs text-muted">
          {formatMoney(config.ratio_money_amount)} = {formatCoins(config.ratio_coin_amount)} coins · Min buy-in{" "}
          {formatCoins(config.min_buy_in_coins)} coins
          {game.location ? ` · ${game.location}` : ""}
        </p>
      </div>

      {game.status === "cancelled" ? (
        <Card>
          <p className="text-sm text-muted">This game was cancelled by the host.</p>
        </Card>
      ) : null}

      {game.status === "tally_pending" ? (
        <Card className="border-warning/40">
          <p className="text-sm font-semibold text-warning">The game has ended — the host is counting chips.</p>
          <p className="mt-1 text-xs text-muted">Final standings will appear here once the tally locks.</p>
        </Card>
      ) : null}

      {showLive || game.status === "tally_pending" ? (
        <>
          <Card className="space-y-1 bg-gold-tint">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">On the table</p>
            <p className="text-3xl font-black tabular-nums text-white">{formatMoney(totals.money)}</p>
            <p className="text-xs text-muted">
              {totals.count} buy-in{totals.count === 1 ? "" : "s"} · {formatCoins(totals.coins)} coins out
            </p>
          </Card>

          <section className="space-y-2">
            <h2 className="font-bold text-white">Players</h2>
            {seats.map((seat) => {
              const own = buyIns.filter((b) => b.game_player_id === seat.id);
              const money = roundMoney(own.reduce((sum, b) => sum + b.money_amount, 0));
              const coins = own.reduce((sum, b) => sum + b.coin_amount, 0);

              return (
                <div key={seat.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
                  <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {seat.name}
                      {seat.isHostPlayer ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                    </p>
                    <p className="text-xs text-muted">
                      {own.length} buy-in{own.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black tabular-nums text-white">{formatMoney(money)}</p>
                    <p className="text-xs tabular-nums text-gold-brand">{formatCoins(coins)} coins</p>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      ) : null}

      {showStandings ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold-brand" />
            <h2 className="font-bold text-white">Final standings</h2>
          </div>
          {winner && winner.tally.net_result_money > 0 && game.status === "closed" ? (
            <Card className="space-y-1 bg-gold-tint text-center shadow-glow">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Winner of the night</p>
              <p className="text-xl font-black text-white">{winner.seat.name}</p>
              <p className="text-2xl font-black tabular-nums text-success">
                {formatSignedMoney(winner.tally.net_result_money)}
              </p>
            </Card>
          ) : null}
          {standings.map(({ tally, seat }, index) => (
            <div key={seat.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
              <span className="w-6 text-center text-sm font-black tabular-nums text-muted">{index + 1}</span>
              <PlayerAvatar name={seat.name} colorKey={seat.colorKey} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {seat.name}
                  {seat.isHostPlayer ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                </p>
                <p className="text-xs text-muted">
                  In {formatMoney(tally.total_buy_in_money)} · out {formatMoney(tally.final_value_money)}
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
      ) : null}

      {showLines ? (
        <section className="space-y-2">
          <h2 className="font-bold text-white">Who pays whom</h2>
          {lines.map((line) => {
            const from = seatsById.get(line.from_game_player_id);
            const to = seatsById.get(line.to_game_player_id);

            if (!from || !to) return null;

            const remaining = roundMoney(line.amount - line.paid_amount);
            const paid = line.status === "paid";
            const uri = to.upiId ? upiLink(to.upiId, to.name, remaining, game.name) : null;

            return (
              <Card key={line.id} className={cn("space-y-3", paid && "opacity-70")}>
                <div className="flex items-center gap-2">
                  <PlayerAvatar name={from.name} colorKey={from.colorKey} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{from.name}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gold-brand" />
                  <span className="min-w-0 flex-1 truncate text-right text-sm font-bold text-white">{to.name}</span>
                  <PlayerAvatar name={to.name} colorKey={to.colorKey} size="sm" />
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
                    {uri && to.upiId ? (
                      <>
                        <Button size="sm" variant="secondary" asChild>
                          <a href={uri}>
                            <Smartphone className="h-4 w-4" />
                            Pay via UPI
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setQrLine({ upiUri: uri, payeeName: to.name, amount: remaining })}
                        >
                          <QrCode className="h-4 w-4" />
                          QR
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => copyText(to.upiId ?? "", `upi-${line.id}`)}>
                          <Copy className="h-4 w-4" />
                          {copied === `upi-${line.id}` ? "Copied!" : "Copy UPI"}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => copyText(String(remaining), `amt-${line.id}`)}>
                        <Copy className="h-4 w-4" />
                        {copied === `amt-${line.id}` ? "Copied!" : "Copy amount"}
                      </Button>
                    )}
                  </div>
                ) : null}
                {!paid ? (
                  <p className="text-xs text-muted">Paid already? Ask the host to mark it settled.</p>
                ) : null}
              </Card>
            );
          })}
        </section>
      ) : null}

      <p className="pt-2 text-center text-xs text-muted">
        Read-only view · tracked with On the House · house party games
      </p>

      <QrSheet
        open={qrLine !== null}
        onClose={() => setQrLine(null)}
        upiUri={qrLine?.upiUri ?? ""}
        payeeName={qrLine?.payeeName ?? ""}
        amount={qrLine?.amount ?? 0}
      />
    </div>
  );
}
