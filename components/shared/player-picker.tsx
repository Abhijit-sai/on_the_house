"use client";

import { Check, ChevronRight, Loader2, Plus, Search, UserPlus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayerAvatar } from "@/components/shared/player-avatar";
import { cn, normalizeName } from "@/lib/utils";

export type PickerPlayer = { id: string; name: string; color_key: string | null };

export type CreatePlayerResult = { ok: boolean; message?: string; player?: PickerPlayer };

type SheetProps = {
  onClose: () => void;
  title: string;
  players: PickerPlayer[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onCreatePlayer?: (name: string) => Promise<CreatePlayerResult>;
  max?: number;
  saveLabel: string;
  emptyHint?: string;
  description?: string;
};

/**
 * The full address book in a sheet: checkbox on the left, search that doubles
 * as "add someone new", and nothing applies until Save. Closing discards.
 */
export function PlayerPickerSheet({
  open,
  title = "Add players",
  saveLabel = "Save",
  ...rest
}: Omit<SheetProps, "title" | "saveLabel"> & { open: boolean; title?: string; saveLabel?: string }) {
  if (!open) return null;

  // Mounting per opening means the draft always starts from the current selection.
  return <PickerSheetBody title={title} saveLabel={saveLabel} {...rest} />;
}

function PickerSheetBody({
  onClose,
  title,
  players,
  selectedIds,
  onSave,
  onCreatePlayer,
  max,
  saveLabel,
  emptyHint,
  description,
}: SheetProps) {
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [query, setQuery] = useState("");
  const [created, setCreated] = useState<PickerPlayer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();

  // People added in this sheet show up immediately, before the page refreshes.
  const all = useMemo(() => {
    const known = new Set(players.map((p) => p.id));
    return [...created.filter((p) => !known.has(p.id)), ...players];
  }, [players, created]);

  const q = normalizeName(query);
  const visible = q ? all.filter((p) => normalizeName(p.name).includes(q)) : all;
  const exactMatch = q !== "" && all.some((p) => normalizeName(p.name) === q);
  const atMax = max !== undefined && draft.length >= max;
  const changed = draft.length !== selectedIds.length || draft.some((id) => !selectedIds.includes(id));

  function toggle(id: string) {
    setError(null);
    setDraft((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (max !== undefined && current.length >= max) return current;
      return [...current, id];
    });
  }

  function addNew() {
    const name = query.trim();

    if (!name || !onCreatePlayer) return;

    if (atMax) {
      setError(`That's the limit of ${max}. Unselect someone first.`);
      return;
    }

    startAdding(async () => {
      const result = await onCreatePlayer(name);

      if (!result.ok || !result.player) {
        setError(result.message ?? "Could not add that player.");
        return;
      }

      const player = result.player;
      setCreated((current) => [player, ...current]);
      setDraft((current) => (current.includes(player.id) ? current : [...current, player.id]));
      setQuery("");
    });
  }

  return (
    <BottomSheet open onClose={onClose} title={title} className="pb-0">
      <div className="space-y-3">
        {description ? <p className="text-sm text-muted">{description}</p> : null}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label="Search players or type a new name"
            placeholder={onCreatePlayer ? "Search, or type a new name" : "Search players"}
            className="pl-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q && !exactMatch) {
                e.preventDefault();
                addNew();
              }
            }}
          />
        </div>

        {onCreatePlayer && q && !exactMatch ? (
          <button
            type="button"
            disabled={adding}
            onClick={addNew}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-dashed border-gold-brand/50 bg-gold-tint px-3 text-left text-sm font-bold text-gold-brand disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
            <span className="min-w-0 flex-1 truncate">Add &ldquo;{query.trim()}&rdquo; as a new player</span>
          </button>
        ) : null}

        {error ? <p className="text-sm text-red-danger">{error}</p> : null}

        <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-elevated">
          {visible.map((player) => {
            const checked = draft.includes(player.id);
            const blocked = !checked && atMax;

            return (
              <label
                key={player.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2",
                  blocked && "cursor-not-allowed opacity-40",
                )}
              >
                <input
                  type="checkbox"
                  aria-label={player.name}
                  className="h-5 w-5 shrink-0 rounded-md border-border bg-surface text-gold-brand focus:ring-gold-brand"
                  checked={checked}
                  disabled={blocked}
                  onChange={() => toggle(player.id)}
                />
                <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-cream">{player.name}</span>
              </label>
            );
          })}
          {visible.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">
              {q ? "Nobody by that name yet." : (emptyHint ?? "No players yet — type a name above to add one.")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-3 border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button
          className="h-12 w-full"
          disabled={!changed}
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          <Check className="h-5 w-5" />
          {saveLabel} · {draft.length}
          {max !== undefined ? `/${max}` : ""} selected
        </Button>
      </div>
    </BottomSheet>
  );
}

/**
 * Inline picker: one scrollable row of the most likely people (selected
 * first), plus a chip that opens the full list. No wrapping walls of chips.
 */
export function PlayerPicker({
  label,
  players,
  selectedIds,
  onChange,
  onCreatePlayer,
  max,
  quickCount = 6,
  sheetTitle,
}: {
  label: string;
  /** Most relevant first — the quick row follows this order. */
  players: PickerPlayer[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreatePlayer?: (name: string) => Promise<CreatePlayerResult>;
  max?: number;
  quickCount?: number;
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);

  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const selected = selectedIds.map((id) => byId.get(id)).filter((p): p is PickerPlayer => Boolean(p));
  const suggestions = players
    .filter((p) => !selectedIds.includes(p.id))
    .slice(0, Math.max(quickCount - selected.length, 3));
  const atMax = max !== undefined && selectedIds.length >= max;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (!atMax) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-white">{label}</h2>
        <span className="text-xs font-bold tabular-nums text-muted">
          {selectedIds.length}
          {max !== undefined ? `/${max}` : ""} selected
        </span>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[...selected, ...suggestions].map((player) => {
          const isSelected = selectedIds.includes(player.id);

          return (
            <button
              key={player.id}
              type="button"
              aria-pressed={isSelected}
              disabled={!isSelected && atMax}
              onClick={() => toggle(player.id)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full border pl-1 pr-3 text-sm font-semibold transition disabled:opacity-40",
                isSelected ? "border-gold-brand/60 bg-gold-tint text-gold-brand" : "border-border bg-elevated text-cream",
              )}
            >
              <PlayerAvatar name={player.name} colorKey={player.color_key} size="sm" className="h-8 w-8" />
              <span className="max-w-[7rem] truncate">{player.name}</span>
              {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1 rounded-full border border-dashed border-gold-brand/50 px-3 text-sm font-bold text-gold-brand"
        >
          {players.length === 0 ? <Plus className="h-4 w-4" /> : null}
          {players.length === 0 ? "Add players" : `All ${players.length}`}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <PlayerPickerSheet
        open={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        players={players}
        selectedIds={selectedIds}
        onSave={onChange}
        onCreatePlayer={onCreatePlayer}
        max={max}
      />
    </div>
  );
}
