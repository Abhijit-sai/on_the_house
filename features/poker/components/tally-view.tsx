"use client";

import { ArrowLeft, Check, Crown, Loader2, Scale } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import type { SettlementMode } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { backToLive, submitFinalTally } from "@/features/poker/actions";
import { seatTotals, tableTotals } from "@/features/poker/derive";
import type { GameDetail } from "@/features/poker/queries";
import { validateFinalTally } from "@/features/settlement/calculations";
import { formatCoins, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TallyView({ detail }: { detail: GameDetail }) {
  const { game, seats, buyIns } = detail;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});

  const hostSeat = seats.find((seat) => seat.is_host_player) ?? null;
  const hasAdvances = seats.some((seat) => seat.advance_money > 0);
  const [mode, setMode] = useState<SettlementMode>(hasAdvances || hostSeat ? "host" : "direct");

  const totals = useMemo(() => tableTotals(buyIns), [buyIns]);

  const allEntered = seats.every((seat) => counts[seat.id] !== undefined && counts[seat.id] !== "");
  const validation = validateFinalTally(
    totals.coins,
    seats.map((seat) => Number(counts[seat.id]) || 0),
  );
  const canSubmit = allEntered && validation.matches;

  const directDisabled = hasAdvances && !hostSeat;
  const hostDisabled = !hostSeat;

  function submit() {
    startTransition(async () => {
      const result = await submitFinalTally({
        gameId: game.id,
        settlementMode: mode,
        counts: seats.map((seat) => ({
          gamePlayerId: seat.id,
          finalCoinCount: Number(counts[seat.id]) || 0,
        })),
      });

      if (!result.ok) setError(result.message ?? "Could not save the tally.");
    });
  }

  return (
    <div className="space-y-5">
      <Card
        className={cn(
          "space-y-1 border",
          !allEntered
            ? "border-border"
            : validation.matches
              ? "border-success/50 shadow-glow"
              : "border-red-danger/50",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Coins counted</p>
            <p
              className={cn(
                "text-3xl font-black tabular-nums",
                !allEntered ? "text-white" : validation.matches ? "text-success" : "text-red-danger",
              )}
            >
              {formatCoins(validation.totalFinalCoins)}
            </p>
          </div>
          <Scale className={cn("h-8 w-8", allEntered && validation.matches ? "text-success" : "text-muted")} />
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Coins issued</p>
            <p className="text-3xl font-black tabular-nums text-white">{formatCoins(totals.coins)}</p>
          </div>
        </div>
        {allEntered && !validation.matches ? (
          <p className="text-sm font-semibold text-red-danger">
            {validation.difference < 0
              ? `Short by ${formatCoins(Math.abs(validation.difference))} coins.`
              : `${formatCoins(validation.difference)} extra coins on the table.`}{" "}
            Recount before settling.
          </p>
        ) : null}
        {allEntered && validation.matches ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="h-4 w-4" />
            Perfect tally. Ready to settle.
          </p>
        ) : null}
      </Card>

      <div className="space-y-2">
        {seats.map((seat) => {
          const totalsForSeat = seatTotals(seat.id, buyIns);

          return (
            <div key={seat.id} className="flex items-center gap-3 rounded-[20px] border border-border bg-elevated p-3">
              <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {seat.player.name}
                  {seat.is_host_player ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                </p>
                <p className="text-xs text-muted">Bought {formatCoins(totalsForSeat.coins)} coins</p>
              </div>
              <Input
                aria-label={`Final chips for ${seat.player.name}`}
                inputMode="numeric"
                placeholder="0"
                className="h-12 w-28 text-right text-lg font-black tabular-nums"
                value={counts[seat.id] ?? ""}
                onChange={(e) => setCounts((c) => ({ ...c, [seat.id]: e.target.value }))}
              />
            </div>
          );
        })}
      </div>

      <Card className="space-y-3">
        <h2 className="font-bold text-white">How should everyone settle?</h2>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={directDisabled}
            onClick={() => setMode("direct")}
            className={cn(
              "rounded-2xl border p-3 text-left disabled:opacity-50",
              mode === "direct" ? "border-gold-brand/60 bg-gold-tint" : "border-border bg-elevated",
            )}
          >
            <p className="text-sm font-bold text-white">Simplified — pay each other</p>
            <p className="text-xs text-muted">
              Fewest payments, losers pay winners directly.
              {directDisabled ? " Unavailable: advances were paid to you, but you have no seat." : ""}
            </p>
          </button>
          <button
            type="button"
            disabled={hostDisabled}
            onClick={() => setMode("host")}
            className={cn(
              "rounded-2xl border p-3 text-left disabled:opacity-50",
              mode === "host" ? "border-gold-brand/60 bg-gold-tint" : "border-border bg-elevated",
            )}
          >
            <p className="text-sm font-bold text-white">Through you — the host bank</p>
            <p className="text-xs text-muted">
              Losers pay you, you pay the winners.
              {hostDisabled ? " Unavailable: mark yourself as a seated player to use this." : ""}
            </p>
          </button>
        </div>
        {hasAdvances ? (
          <p className="rounded-2xl bg-gold-tint px-3 py-2 text-xs text-gold-brand">
            Advances of {formatMoney(seats.reduce((sum, seat) => sum + seat.advance_money, 0))} are already with you —
            they'll be netted into the final amounts automatically.
          </p>
        ) : null}
      </Card>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <div className="sticky bottom-24 z-10 space-y-2">
        <Button className="h-14 w-full text-base shadow-glow" disabled={!canSubmit || isPending} onClick={submit}>
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
          {canSubmit ? "Lock tally & generate settlement" : "Tally must match to continue"}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-muted"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await backToLive(game.id);

              if (!result.ok) setError(result.message ?? "Could not resume the game.");
            })
          }
        >
          <ArrowLeft className="h-4 w-4" />
          Back to live game
        </Button>
      </div>
    </div>
  );
}
