"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareGameLink({
  token,
  gameName,
  basePath = "/g",
  label = "Share live link with the table",
}: {
  token: string;
  gameName: string;
  basePath?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${basePath}/${token}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${gameName} — On the House`, url });
        return;
      } catch {
        // fall through to clipboard if the user dismissed or share failed
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy the game link:", url);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={share}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Link copied!" : label}
    </Button>
  );
}
