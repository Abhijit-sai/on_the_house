"use client";

import { Edit3, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PlayerForm } from "@/features/players/components/player-form";
import type { Player } from "@/db/types/database";

export function PlayerList({ players }: { players: Player[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (players.length === 0) {
    return <EmptyState title="No players yet" description="Add your regulars here before the first Poker Night." />;
  }

  return (
    <div className="space-y-3">
      {players.map((player) => {
        const isEditing = editingId === player.id;

        return (
          <Card key={player.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold-brand/15 text-gold-brand">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{player.name}</p>
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
