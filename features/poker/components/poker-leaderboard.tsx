import { Crown, Medal, TrendingDown, TrendingUp } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { LeaderboardRow, LeaderboardSummary } from "@/features/poker/leaderboard";
import { formatMoney, formatSignedMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const rankStyles = [
  "border-gold-brand/50 bg-gold-tint shadow-glow",
  "border-cream/25 bg-elevated",
  "border-red-deep/40 bg-elevated",
];

function FormDots({ form }: { form: number[] }) {
  if (form.length === 0) return null;

  return (
    <span className="inline-flex items-center gap-1" aria-label="Recent nights, newest first">
      {form.map((net, index) => (
        <span
          key={index}
          title={formatSignedMoney(net)}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            net > 0 ? "bg-success" : net < 0 ? "bg-red-danger" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function PokerLeaderboard({
  rows,
  summary,
  limit,
}: {
  rows: LeaderboardRow[];
  summary: LeaderboardSummary;
  /** Show only the top N (dashboard preview). */
  limit?: number;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No standings yet"
        description="Close out a game night and the lifetime table starts keeping score."
      />
    );
  }

  const visible = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="space-y-4">
      {limit ? null : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <p className="text-xs text-muted">Nights settled</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{summary.gamesSettled}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Volume tracked</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{formatMoney(summary.volumeTracked)}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Biggest single night</p>
            {summary.bestSingleNight ? (
              <>
                <p className="mt-1 truncate text-lg font-black">{summary.bestSingleNight.name}</p>
                <p className="text-sm font-bold tabular-nums text-success">
                  {formatSignedMoney(summary.bestSingleNight.amount)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-2xl font-black text-muted">—</p>
            )}
          </Card>
          <Card>
            <p className="text-xs text-muted">Paying for the chips</p>
            {summary.biggestLoser ? (
              <>
                <p className="mt-1 truncate text-lg font-black">{summary.biggestLoser.name}</p>
                <p className="text-sm font-bold tabular-nums text-red-danger">
                  {formatSignedMoney(summary.biggestLoser.lifetimeNet)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-2xl font-black text-muted">—</p>
            )}
          </Card>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((row, index) => {
          const rank = index + 1;
          const winRate = row.gamesPlayed > 0 ? Math.round((row.nightsWon / row.gamesPlayed) * 100) : 0;

          return (
            <div
              key={row.playerId}
              className={cn(
                "rounded-[20px] border p-4",
                rank <= 3 ? rankStyles[rank - 1] : "border-border bg-elevated",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="flex w-7 shrink-0 justify-center">
                  {rank === 1 ? (
                    <Crown className="h-5 w-5 text-gold-brand" />
                  ) : rank <= 3 ? (
                    <Medal className={cn("h-5 w-5", rank === 2 ? "text-cream/70" : "text-red-danger/70")} />
                  ) : (
                    <span className="text-sm font-black tabular-nums text-muted">{rank}</span>
                  )}
                </span>
                <PlayerAvatar name={row.name} colorKey={row.colorKey} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{row.name}</p>
                  <p className="flex items-center gap-2 text-xs text-muted">
                    <FormDots form={row.form} />
                    {row.gamesPlayed} night{row.gamesPlayed === 1 ? "" : "s"} · {winRate}% won
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-lg font-black tabular-nums",
                      row.lifetimeNet > 0 ? "text-success" : row.lifetimeNet < 0 ? "text-red-danger" : "text-muted",
                    )}
                  >
                    {formatSignedMoney(row.lifetimeNet)}
                  </p>
                  <p className="text-[11px] text-muted">{formatSignedMoney(row.averageNet)}/night</p>
                </div>
              </div>

              {limit ? null : (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted">
                  {row.bestNight ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-success" />
                      Best {formatSignedMoney(row.bestNight.amount)} · {row.bestNight.gameName}
                    </span>
                  ) : null}
                  {row.worstNight ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-danger" />
                      Worst {formatSignedMoney(row.worstNight.amount)} · {row.worstNight.gameName}
                    </span>
                  ) : null}
                  <span>Bought in {formatMoney(row.totalBuyIn)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
