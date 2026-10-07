"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { cn } from "@/lib/utils";

export type Confirm = {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "caution" | "neutral";
  onConfirm: () => void;
};

/** "Are you sure?" for God's big calls: a kill, a vote, sparing the town, sending someone home. */
export function ConfirmSheet({ confirm, onClose }: { confirm: Confirm | null; onClose: () => void }) {
  const tone = confirm?.tone ?? "danger";

  return (
    <BottomSheet open={confirm !== null} onClose={onClose} title={confirm?.title}>
      {confirm ? (
        <div className="space-y-4">
          <div
            className={cn(
              "rounded-2xl border p-3 text-sm leading-6",
              tone === "danger" && "border-red-brand/40 bg-red-brand/10 text-cream",
              tone === "caution" && "border-warning/40 bg-warning/10 text-cream",
              tone === "neutral" && "border-border bg-elevated text-cream",
            )}
          >
            {confirm.body}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-14" onClick={onClose}>
              Go back
            </Button>
            <Button
              variant={tone === "danger" ? "destructive" : "default"}
              className={cn("h-14", tone === "caution" && "bg-warning text-background hover:bg-warning/90")}
              onClick={() => {
                onClose();
                confirm.onConfirm();
              }}
            >
              {confirm.confirmLabel}
            </Button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}
