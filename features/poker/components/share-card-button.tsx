"use client";

import { ImageDown, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { shareOrDownloadCard, type ShareCardData, type ShareCardVariant } from "@/lib/share-card";

const variants: { value: ShareCardVariant; title: string; description: string }[] = [
  { value: "winner", title: "Winner of the Night", description: "Big trophy moment for the group chat." },
  { value: "standings", title: "Final Damage Report", description: "Everyone's profit and loss, ranked." },
  { value: "settlement", title: "Who Pays Whom", description: "The settlement plan, no excuses." },
];

export function ShareCardButton({ data }: { data: ShareCardData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ShareCardVariant | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(variant: ShareCardVariant) {
    setBusy(variant);
    setError(null);

    try {
      const slug = data.gameName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      await shareOrDownloadCard(variant, data, `on-the-house-${slug}-${variant}.png`);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the card.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        Share result card
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Pick a card">
        <div className="space-y-3">
          {variants.map((variant) => (
            <button
              key={variant.value}
              type="button"
              disabled={busy !== null}
              onClick={() => generate(variant.value)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-elevated p-4 text-left disabled:opacity-60"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">{variant.title}</p>
                <p className="text-xs text-muted">{variant.description}</p>
              </div>
              {busy === variant.value ? (
                <Loader2 className="h-5 w-5 animate-spin text-gold-brand" />
              ) : (
                <ImageDown className="h-5 w-5 text-gold-brand" />
              )}
            </button>
          ))}
          {error ? (
            <p className="rounded-2xl border border-red-danger/30 bg-red-danger/10 p-3 text-sm text-red-danger">{error}</p>
          ) : null}
          <p className="text-xs text-muted">1080×1920 story card — no UPI IDs or private details included.</p>
        </div>
      </BottomSheet>
    </>
  );
}
