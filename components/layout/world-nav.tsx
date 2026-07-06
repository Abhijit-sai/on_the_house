"use client";

import { Gamepad2, History, Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Shared spaces — identical in every game world.
const navItems = [
  { href: "/app/arcade", label: "Arcade", icon: Gamepad2 },
  { href: "/app/players", label: "Players", icon: Users },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function worldCta(pathname: string) {
  if (pathname.startsWith("/app/rallies")) {
    return { href: "/app/rallies/new", label: "Start a rally", className: "bg-red-brand text-white shadow-red-glow" };
  }

  if (pathname.startsWith("/app/dashboard") || pathname.startsWith("/app/games")) {
    return { href: "/app/games/new", label: "New game night", className: "bg-gold-brand text-background shadow-glow" };
  }

  return null;
}

export function SidebarWorldCta() {
  const pathname = usePathname();
  const cta = worldCta(pathname);

  if (!cta) return null;

  return (
    <Link href={cta.href} className={cn("mb-4 flex min-h-11 items-center gap-2 rounded-2xl px-4 text-sm font-bold", cta.className)}>
      <Plus className="h-4 w-4" />
      {cta.label}
    </Link>
  );
}

export function SidebarWorldNav() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => {
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
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-4 gap-1">
      {navItems.map((item) => {
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
