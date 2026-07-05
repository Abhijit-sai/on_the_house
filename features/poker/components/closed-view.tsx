"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Crown, Loader2, RotateCcw, Trophy } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { reopenGame } from "@/features/poker/actions";
import { ShareCardButton } from "@/features/poker/components/share-card-button";
import type { GameDetail, SeatedPlayer } from "@/features/poker/queries";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { tableTotals } from "@/features/poker/derive";
import type { ShareCardData } from "@/lib/share-card";
import { cn } from "@/lib/utils";

export function ClosedView({ detail }: { detail: GameDetail }) {
  const { game, seats, tallies, buyIns, batch } = detail;
  const cancelled = game.status === "cancelled";
  const reducedMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const seatsById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);
  const totals = useMemo(() => tableTotals(buyIns), [buyIns]);

  const standings = useMemo(
    () =>
      [...tallies]
        .map((tally) => ({ tally, seat: seatsById.get(tally.game_player_id) ?? null }))
        .filter((entry): entry is { tally: (typeof tallies)[number]; seat: SeatedPlayer } => entry.seat !== null)
        .sort((a, b) => b.tally.net_result_money - a.tally.net_result_money),
    [tallies, seatsById],
  );

  const winner = standings[0];

  const shareData: ShareCardData = {
    gameName: game.name,
    dateLabel: new Date(game.closed_at ?? game.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    totalTracked: totals.money,
    winner: winner && winner.tally.net_result_money > 0 ? { name: winner.seat.player.name, net: winner.tally.net_result_money } : null,
    standings: standings.map(({ tally, seat }) => ({ name: seat.player.name, net: tally.net_result_money })),
    settlements: (batch?.lines ?? []).map((line) => ({
      from: seatsById.get(line.from_game_player_id)?.player.name ?? "?",
      to: seatsById.get(line.to_game_player_id)?.player.name ?? "?",
      amount: line.amount,
    })),
  };

  if (cancelled) {
    return (
      <Card className="space-y-2">
        <h2 className="font-bold text-white">Game cancelled</h2>
        <p className="text-sm text-muted">
          This table was abandoned{totals.count > 0 ? ` with ${formatMoney(totals.money)} in recorded buy-ins` : ""}. No
          settlement was generated.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {winner && winner.tally.net_result_money > 0 ? (
        <motion.div
          initial={reducedMotion ? false : { scale: 0.7, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <Card className="space-y-2 bg-gold-tint text-center shadow-glow">
            <motion.div
              initial={reducedMotion ? false : { rotate: -12, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
            >
              <Trophy className="mx-auto h-8 w-8 text-gold-brand" />
            </motion.div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Winner of the night</p>
            <div className="flex items-center justify-center gap-2">
              <PlayerAvatar name={winner.seat.player.name} colorKey={winner.seat.player.color_key} size="sm" />
              <p className="text-xl font-black text-white">{winner.seat.player.name}</p>
            </div>
            <p className="text-2xl font-black tabular-nums text-success">
              {formatSignedMoney(winner.tally.net_result_money)}
            </p>
          </Card>
        </motion.div>
      ) : null}

      <Card className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Night recap</p>
        <p className="text-2xl font-black tabular-nums text-white">{formatMoney(totals.money)} tracked</p>
        <p className="text-xs text-muted">
          {totals.count} buy-ins · {seats.length} players · fully settled
        </p>
      </Card>

      <section className="space-y-2">
        <h2 className="font-bold text-white">Final standings</h2>
        {standings.map(({ tally, seat }, index) => (
          <div key={tally.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
            <span className="w-6 text-center text-sm font-black tabular-nums text-muted">{index + 1}</span>
            <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {seat.player.name}
              {seat.is_host_player ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
            </p>
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

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <ShareCardButton data={shareData} />

      <Button
        variant="ghost"
        className="w-full text-muted"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await reopenGame(game.id);

            if (!result.ok) setError(result.message ?? "Could not reopen the game.");
          })
        }
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        Reopen game
      </Button>
    </div>
  );
}
