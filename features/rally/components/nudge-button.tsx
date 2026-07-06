"use client";

import { Check, Megaphone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RallyView } from "@/features/rally/view";

export function NudgeButton({ view }: { view: RallyView }) {
  const [copied, setCopied] = useState(false);

  const missing = view.members.filter((m) => !m.checkedInToday);
  const show = view.rally.status === "active" && view.hasStarted && !view.hasEnded && missing.length > 0;

  if (!show) return null;

  async function nudge() {
    const url = `${window.location.origin}/r/${view.rally.public_token}`;
    const names = missing.map((m) => m.name).join(", ");
    const text = [
      `🔥 ${view.rally.title} — Day ${view.dayNumber}/${view.totalDays}`,
      `Still missing today: ${names}`,
      `Check in here 👉 ${url}`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // dismissed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the nudge:", text);
    }
  }

  return (
    <Button variant="secondary" className="w-full border-warning/40 text-warning" onClick={nudge}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Megaphone className="h-4 w-4" />}
      {copied ? "Nudge copied — paste it in the group chat" : `Nudge the ${missing.length} missing`}
    </Button>
  );
}
