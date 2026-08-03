"use client";

import { Crown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { claimPokerSeat } from "@/features/poker/actions";
import type { SeatedPlayer } from "@/features/poker/queries";

/**
 * Shown when no seat is marked as the host's own. Without it, host settlement
 * and advances are unavailable, so this repairs the game in one tap.
 */
export function ClaimSeatCard({ gameId, seats }: { gameId: string; seats: SeatedPlayer[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (seats.some((seat) => seat.is_host_player)) return null;

  return (
    <Card className="space-y-3 bg-gold-tint">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-gold-brand" />
        <h2 className="font-bold text-white">Which seat is you?</h2>
      </div>
      <p className="text-xs text-muted">
        Claim your seat to record advances and settle through yourself as the bank. Skip it and you can still settle
        player-to-player.
      </p>
      <div className="flex flex-wrap gap-2">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await claimPokerSeat(gameId, seat.id);

                if (!result.ok) {
                  setError(result.message ?? "Could not claim the seat.");
                  return;
                }

                router.refresh();
              })
            }
            className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-elevated px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-60"
          >
            <PlayerAvatar name={seat.player.name} colorKey={seat.player.color_key} size="sm" />
            {seat.player.name}
          </button>
        ))}
        {isPending ? <Loader2 className="h-5 w-5 animate-spin self-center text-gold-brand" /> : null}
      </div>
      {error ? <p className="text-sm text-red-danger">{error}</p> : null}
    </Card>
  );
}
