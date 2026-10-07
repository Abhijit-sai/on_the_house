"use client";

import { Drama, Flame, Gamepad2, Spade, VenetianMask } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WORLD_KEY = "oth-last-world";

const worlds = [
  {
    id: "arcade",
    href: "/app/arcade",
    label: "Arcade",
    icon: Gamepad2,
    accent: "text-cream",
    pill: "border-cream/30 bg-white/10 text-cream",
    matches: (path: string) => path.startsWith("/app/arcade"),
  },
  {
    id: "poker",
    href: "/app/dashboard",
    label: "Poker",
    icon: Spade,
    accent: "text-gold-brand",
    pill: "border-gold-brand/50 bg-gold-brand/15 text-gold-brand",
    matches: (path: string) => path.startsWith("/app/dashboard") || path.startsWith("/app/games"),
  },
  {
    id: "rally",
    href: "/app/rallies",
    label: "Rally",
    icon: Flame,
    accent: "text-red-danger",
    pill: "border-red-danger/50 bg-red-danger/15 text-red-danger",
    matches: (path: string) => path.startsWith("/app/rallies"),
  },
  {
    id: "imposter",
    href: "/app/imposter",
    label: "Imposter",
    icon: VenetianMask,
    accent: "text-violet-400",
    pill: "border-violet-400/50 bg-violet-500/15 text-violet-300",
    matches: (path: string) => path.startsWith("/app/imposter"),
  },
  {
    id: "mafia",
    href: "/app/mafia",
    label: "Mafia",
    icon: Drama,
    accent: "text-red-brand",
    pill: "border-red-brand/60 bg-red-brand/15 text-red-200",
    matches: (path: string) => path.startsWith("/app/mafia"),
  },
];

/**
 * Which world we're in. On shared pages (Players, History, Settings) it's the
 * world the host was last inside, so the dock never feels yanked out from under them.
 */
function useCurrentWorld() {
  const pathname = usePathname();
  const [remembered, setRemembered] = useState<string | null>(null);
  const pathWorld = worlds.find((w) => w.matches(pathname)) ?? null;

  useEffect(() => {
    try {
      if (pathWorld && pathWorld.id !== "arcade") {
        window.localStorage.setItem(WORLD_KEY, pathWorld.id);
        setRemembered(pathWorld.id);
      } else if (!pathWorld) {
        setRemembered(window.localStorage.getItem(WORLD_KEY));
      }
    } catch {
      // storage blocked — fall back to the arcade
    }
  }, [pathWorld]);

  return { current: pathWorld ?? worlds.find((w) => w.id === remembered) ?? null, exact: pathWorld !== null };
}

/**
 * Every game, one tap away: a row of icons with the current game opened up
 * into a labelled pill. Replaces the old dropdown, which hid the games behind
 * a second tap.
 */
export function GameDock() {
  const { current, exact } = useCurrentWorld();

  return (
    <nav aria-label="Games" className="flex min-w-0 items-center gap-1">
      {worlds.map((world) => {
        const Icon = world.icon;
        const active = world.id === current?.id;
        return (
          <Link
            key={world.id}
            href={world.href}
            aria-label={world.label}
            aria-current={active && exact ? "page" : undefined}
            className={cn(
              "flex h-9 shrink-0 items-center rounded-full border transition-all duration-300 active:scale-95",
              active
                ? cn("gap-1.5 pl-2.5 pr-3", world.pill, !exact && "opacity-70")
                : "w-9 justify-center border-transparent",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "" : world.accent, !active && "opacity-80")} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-xs font-bold transition-all duration-300",
                active ? "max-w-[6rem] opacity-100" : "max-w-0 opacity-0",
              )}
            >
              {world.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The same games as a list for the desktop sidebar. */
export function SidebarGames() {
  const { current, exact } = useCurrentWorld();

  return (
    <nav aria-label="Games" className="space-y-1">
      <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.25em] text-muted">Games</p>
      {worlds.map((world) => {
        const Icon = world.icon;
        const active = world.id === current?.id;
        return (
          <Link
            key={world.id}
            href={world.href}
            aria-current={active && exact ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition",
              active
                ? cn(world.pill, !exact && "opacity-70")
                : "border-transparent text-muted hover:bg-elevated hover:text-cream",
            )}
          >
            <Icon className={cn("h-4 w-4", !active && world.accent)} />
            {world.label}
          </Link>
        );
      })}
    </nav>
  );
}
