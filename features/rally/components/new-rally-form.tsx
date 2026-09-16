"use client";

import { Crown, Flame, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Player } from "@/db/types/database";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { PlayerPicker, type CreatePlayerResult, type PickerPlayer } from "@/components/shared/player-picker";
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
  // Players created from the picker render immediately, ahead of the refresh.
  const [extraPlayers, setExtraPlayers] = useState<PickerPlayer[]>([]);

  const allPlayers = useMemo(() => {
    const known = new Set(players.map((p) => p.id));
    return [...extraPlayers.filter((p) => !known.has(p.id)), ...players];
  }, [players, extraPlayers]);

  const playersById = useMemo(() => new Map(allPlayers.map((p) => [p.id, p])), [allPlayers]);

  /** Apply the picker's selection; auto-crown whoever carries the host's name. */
  function setMembers(ids: string[]) {
    setError(null);
    const next = ids.slice(0, 20);
    setMemberIds(next);

    setHostPlayerId((current) => {
      if (current && next.includes(current)) return current;
      if (!hostName) return null;

      const me = next.find(
        (id) => playersById.get(id)?.name.trim().toLowerCase() === hostName.trim().toLowerCase(),
      );

      return me ?? null;
    });
  }

  async function createPlayer(playerName: string): Promise<CreatePlayerResult> {
    const result = await savePlayer({ name: playerName });

    if (result.ok && result.player) {
      const created = result.player;
      setExtraPlayers((current) => [created, ...current]);
      router.refresh();
    }

    return result;
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
        <PlayerPicker
          label="Who's in?"
          players={allPlayers}
          selectedIds={memberIds}
          onChange={setMembers}
          onCreatePlayer={createPlayer}
          max={20}
        />

        {memberIds.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-muted">
              <Crown className="mb-0.5 mr-0.5 inline h-3 w-3" /> marks you, so you can rally along too.
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
              {memberIds.map((playerId) => {
                const player = playersById.get(playerId);

                if (!player) return null;

                return (
                  <div key={playerId} className="flex min-h-12 items-center gap-3 px-3 py-1.5">
                    <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{player.name}</span>
                    <button
                      type="button"
                      aria-label={hostPlayerId === playerId ? "Unmark as you" : "Mark as you"}
                      aria-pressed={hostPlayerId === playerId}
                      onClick={() => setHostPlayerId((current) => (current === playerId ? null : playerId))}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                        hostPlayerId === playerId ? "border-gold-brand bg-gold-tint text-gold-brand" : "border-border text-muted",
                      )}
                    >
                      <Crown className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
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
