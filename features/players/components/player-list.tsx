"use client";

import { Edit3, Flame, Spade, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PlayerForm } from "@/features/players/components/player-form";
import type { Player } from "@/db/types/database";
import { cn } from "@/lib/utils";

type GameFilter = "all" | "poker" | "rally";

const filters: { value: GameFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "poker", label: "♠ Poker Night" },
  { value: "rally", label: "🔥 Rally" },
];

export function PlayerList({
  players,
  pokerPlayerIds = [],
  rallyPlayerIds = [],
}: {
  players: Player[];
  pokerPlayerIds?: string[];
  rallyPlayerIds?: string[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<GameFilter>("all");

  const pokerSet = new Set(pokerPlayerIds);
  const rallySet = new Set(rallyPlayerIds);

  if (players.length === 0) {
    return <EmptyState title="No players yet" description="Add your regulars here before the first game." />;
  }

  const visible = players.filter((player) => {
    if (filter === "poker") return pokerSet.has(player.id);
    if (filter === "rally") return rallySet.has(player.id);
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-bold",
              filter === f.value ? "border-gold-brand/60 bg-gold-tint text-gold-brand" : "border-border bg-elevated text-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No players in this game yet"
          description={filter === "poker" ? "Nobody has been seated at a poker table yet." : "Nobody has joined a rally yet."}
        />
      ) : null}

      {visible.map((player) => {
        const isEditing = editingId === player.id;

        return (
          <Card key={player.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-brand/15 text-gold-brand">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">
                  {player.name}
                  {pokerSet.has(player.id) ? <Spade className="ml-1.5 inline h-3.5 w-3.5 text-gold-brand" /> : null}
                  {rallySet.has(player.id) ? <Flame className="ml-1 inline h-3.5 w-3.5 text-red-danger" /> : null}
                </p>
                <p className="truncate text-sm text-muted">{player.upi_id ? player.upi_id : "UPI not added"}</p>
              </div>
              <Button variant="secondary" size="icon" onClick={() => setEditingId(isEditing ? null : player.id)} aria-label="Edit player">
                <Edit3 className="h-4 w-4" />
              </Button>
            </div>
            {isEditing ? (
              <PlayerForm
                player={{ id: player.id, name: player.name, upiId: player.upi_id ?? "" }}
                onSaved={() => setEditingId(null)}
              />
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
