"use client";

import { Crown, Flame, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { savePlayer } from "@/features/players/actions";
import { createRally } from "@/features/rally/actions";
import { addDays, todayISO } from "@/features/rally/engine";
import { cn } from "@/lib/utils";

const durations = [
  { label: "7 days", days: 7 },
  { label: "21 days", days: 21 },
  { label: "30 days", days: 30 },
  { label: "66 days", days: 66 },
];

export function NewRallyForm({ players, hostName }: { players: Player[]; hostName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 29));
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickAddPending, startQuickAdd] = useTransition();

  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  function toggleMember(playerId: string) {
    setError(null);
    setMemberIds((current) => {
      if (current.includes(playerId)) {
        setHostPlayerId((h) => (h === playerId ? null : h));
        return current.filter((id) => id !== playerId);
      }

      if (current.length >= 20) return current;

      // Auto-crown when the host seats a player carrying their own name.
      const player = playersById.get(playerId);

      if (hostName && player && player.name.trim().toLowerCase() === hostName.trim().toLowerCase()) {
        setHostPlayerId((h) => h ?? playerId);
      }

      return [...current, playerId];
    });
  }

  function quickAddPlayer() {
    const trimmed = quickName.trim();

    if (!trimmed) return;

    startQuickAdd(async () => {
      const result = await savePlayer({ name: trimmed });

      if (!result.ok) {
        setError(result.message ?? "Could not add player.");
        return;
      }

      setQuickName("");
      router.refresh();
    });
  }

  function create() {
    startTransition(async () => {
      const result = await createRally({
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        members: memberIds.map((playerId) => ({ playerId, isHostMember: playerId === hostPlayerId })),
      });

      if (!result.ok || !result.rallyId) {
        setError(result.message ?? "Could not create the rally.");
        return;
      }

      router.push(`/app/rallies/${result.rallyId}`);
    });
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rally-title">What's the challenge?</Label>
          <Input
            id="rally-title"
            placeholder="30 days of morning workouts"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rally-desc">The rules (optional)</Label>
          <Input
            id="rally-desc"
            placeholder="Minimum 30 minutes, photo or it didn't happen"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-danger" />
          <h2 className="font-bold text-white">How long do you rally?</h2>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {durations.map((duration) => {
            const targetEnd = addDays(startDate, duration.days - 1);

            return (
              <button
                key={duration.days}
                type="button"
                onClick={() => setEndDate(targetEnd)}
                className={cn(
                  "min-h-11 rounded-2xl border px-2 py-2 text-xs font-bold",
                  endDate === targetEnd ? "border-gold-brand/60 bg-gold-tint text-gold-brand" : "border-border bg-elevated text-cream",
                )}
              >
                {duration.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="rally-start">Starts</Label>
            <Input id="rally-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rally-end">Ends</Label>
            <Input id="rally-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white">Who's in?</h2>
          <span className="text-xs font-bold text-muted">{memberIds.length}/20</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map((player) => {
            const selected = memberIds.includes(player.id);

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => toggleMember(player.id)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                  selected ? "border-gold-brand/60 bg-gold-tint text-gold-brand" : "border-border bg-elevated text-cream",
                )}
              >
                <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                {player.name}
              </button>
            );
          })}
          {players.length === 0 ? <p className="text-sm text-muted">No saved players yet — add your first below.</p> : null}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Quick add member…"
            value={quickName}
            onChange={(e) => setQuickName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                quickAddPlayer();
              }
            }}
          />
          <Button type="button" variant="secondary" size="icon" onClick={quickAddPlayer} disabled={quickAddPending}>
            {quickAddPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>

        {memberIds.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Tap the crown on your own seat so you can rally along too.</p>
            {memberIds.map((playerId) => {
              const player = playersById.get(playerId);

              if (!player) return null;

              return (
                <div key={playerId} className="flex items-center gap-3 rounded-2xl border border-border bg-elevated p-3">
                  <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                  <span className="flex-1 text-sm font-bold text-white">{player.name}</span>
                  <button
                    type="button"
                    aria-label={hostPlayerId === playerId ? "Unmark as you" : "Mark as you"}
                    onClick={() => setHostPlayerId((current) => (current === playerId ? null : playerId))}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border",
                      hostPlayerId === playerId ? "border-gold-brand bg-gold-tint text-gold-brand shadow-glow" : "border-border text-muted",
                    )}
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card>

      {error ? (
        <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
      ) : null}

      {memberIds.length > 0 && !hostPlayerId ? (
        <p className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          No seat is marked as you — crown yourself above so you can check in and rally too. You can also claim a seat
          later from the rally room.
        </p>
      ) : null}

      <Button className="h-14 w-full text-base shadow-red-glow" disabled={isPending || memberIds.length === 0} onClick={create}>
        {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flame className="h-5 w-5" />}
        Start the rally
      </Button>
    </div>
  );
}
