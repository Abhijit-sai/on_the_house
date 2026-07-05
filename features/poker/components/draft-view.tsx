"use client";

import { Crown, Loader2, Play, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cancelGame, startGame } from "@/features/poker/actions";
import type { GameDetail } from "@/features/poker/queries";
import { formatMoney } from "@/lib/format";

export function DraftView({ detail }: { detail: GameDetail }) {
  const { game, seats } = detail;
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) setError(result.message ?? "Something went wrong.");
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3">
        <h2 className="font-bold text-white">Table lineup</h2>
        <div className="space-y-2">
          {seats.map((seat, index) => (
            <div key={seat.id} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
              <span className="w-6 text-center text-sm font-black tabular-nums text-gold-brand">{index + 1}</span>
              <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
              <span className="flex-1 truncate text-sm font-bold text-white">
                {seat.player.name}
                {seat.is_host_player ? <Crown className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
              </span>
              {seat.advance_money > 0 ? (
                <span className="rounded-full bg-gold-tint px-2.5 py-1 text-xs font-bold text-gold-brand">
                  Adv {formatMoney(seat.advance_money)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      <div className="space-y-3">
        <Button className="h-14 w-full text-base shadow-glow" disabled={isPending} onClick={() => run(() => startGame(game.id))}>
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          Deal me in — start game
        </Button>
        <Button variant="ghost" className="w-full text-muted" disabled={isPending} onClick={() => setConfirmCancel(true)}>
          <Trash2 className="h-4 w-4" />
          Cancel this game
        </Button>
      </div>

      <BottomSheet open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Cancel this game?">
        <div className="space-y-4">
          <p className="text-sm text-muted">The table setup will move to history as cancelled. This cannot be undone.</p>
          <Button
            variant="destructive"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              setConfirmCancel(false);
              run(() => cancelGame(game.id));
            }}
          >
            Yes, cancel the game
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmCancel(false)}>
            Keep it
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
