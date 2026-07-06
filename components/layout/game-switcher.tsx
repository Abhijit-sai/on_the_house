"use client";

import { ChevronsUpDown, Flame, Spade } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const worlds = [
  {
    href: "/app/dashboard",
    label: "Game Nights",
    icon: Spade,
    accent: "text-gold-brand",
    matches: (path: string) => !path.startsWith("/app/rallies"),
  },
  {
    href: "/app/rallies",
    label: "Rallies",
    icon: Flame,
    accent: "text-red-danger",
    matches: (path: string) => path.startsWith("/app/rallies"),
  },
];

export function GameSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = worlds.find((w) => w.matches(pathname)) ?? worlds[0];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-elevated px-3 py-1.5 text-xs font-bold text-cream"
      >
        <CurrentIcon className={cn("h-3.5 w-3.5", current.accent)} />
        {current.label}
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-surface shadow-glow"
        >
          {worlds.map((world) => {
            const Icon = world.icon;
            const active = world === current;

            return (
              <Link
                key={world.href}
                href={world.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 px-4 text-sm font-semibold",
                  active ? "bg-elevated text-white" : "text-muted hover:bg-elevated hover:text-cream",
                )}
              >
                <Icon className={cn("h-4 w-4", world.accent)} />
                {world.label}
                {active ? <span className="ml-auto text-gold-brand">✓</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
