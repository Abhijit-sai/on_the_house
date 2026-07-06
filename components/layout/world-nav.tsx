"use client";

import { Flame, History, Home, Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const worlds = {
  rally: {
    cta: { href: "/app/rallies/new", label: "Start a rally", className: "bg-red-brand text-white shadow-red-glow" },
    nav: [
      { href: "/app/rallies", label: "Rallies", icon: Flame },
      { href: "/app/players", label: "Players", icon: Users },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
  poker: {
    cta: { href: "/app/games/new", label: "New game night", className: "bg-gold-brand text-background shadow-glow" },
    nav: [
      { href: "/app/dashboard", label: "Home", icon: Home },
      { href: "/app/players", label: "Players", icon: Users },
      { href: "/app/history", label: "History", icon: History },
      { href: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
};

function useWorld() {
  const pathname = usePathname();
  return pathname.startsWith("/app/rallies") ? worlds.rally : worlds.poker;
}

export function SidebarWorldCta() {
  const world = useWorld();

  return (
    <Link
      href={world.cta.href}
      className={cn("mb-4 flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold", world.cta.className)}
    >
      <Plus className="h-4 w-4" />
      {world.cta.label}
    </Link>
  );
}

export function SidebarWorldNav() {
  const world = useWorld();
  const pathname = usePathname();

  return (
    <>
      {world.nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold",
              active ? "bg-elevated text-white" : "text-muted hover:bg-elevated hover:text-cream",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function BottomWorldNav() {
  const world = useWorld();
  const pathname = usePathname();

  return (
    <div className={cn("grid gap-1", world.nav.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
      {world.nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold",
              active ? "text-cream" : "text-muted hover:bg-elevated hover:text-cream",
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
