import { MapPin } from "lucide-react";
import type { Game, PokerGameConfig } from "@/db/types/database";
import { StatusBadge } from "@/features/poker/components/status-badge";
import { formatCoins, formatMoney } from "@/lib/format";

export function GameHeader({ game, config }: { game: Game; config: PokerGameConfig }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-black text-white">{game.name}</h1>
        <StatusBadge status={game.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span className="rounded-full border border-border bg-elevated px-2.5 py-1 font-semibold text-gold-brand">
          {formatMoney(config.ratio_money_amount)} = {formatCoins(config.ratio_coin_amount)} coins
        </span>
        <span className="rounded-full border border-border bg-elevated px-2.5 py-1 font-semibold">
          Min {formatCoins(config.min_buy_in_coins)} coins
        </span>
        {config.max_buy_in_coins_per_player ? (
          <span className="rounded-full border border-border bg-elevated px-2.5 py-1 font-semibold">
            Max {formatCoins(config.max_buy_in_coins_per_player)} coins
          </span>
        ) : null}
        {game.location ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {game.location}
          </span>
        ) : null}
      </div>
    </div>
  );
}
