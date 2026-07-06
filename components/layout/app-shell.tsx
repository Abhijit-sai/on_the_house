import { UserButton } from "@clerk/nextjs";
import { History, Home, Plus, Settings, Users } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { GameSwitcher } from "@/components/layout/game-switcher";
import { getCurrentHost } from "@/features/hosts/queries";

const navItems = [
  { href: "/app/dashboard", label: "Home", icon: Home },
  { href: "/app/players", label: "Players", icon: Users },
  { href: "/app/history", label: "History", icon: History },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const host = await getCurrentHost();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background text-cream lg:flex lg:max-w-6xl lg:gap-8 lg:px-6">
      {/* Desktop sidebar */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-60 lg:shrink-0 lg:flex-col lg:gap-2 lg:py-8">
        <div className="mb-4 px-3">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-gold-brand">On the House</p>
          <p className="mt-1 text-xs text-muted">{host?.display_name ?? "Game night host"}</p>
        </div>
        <div className="mb-4 px-3">
          <GameSwitcher />
        </div>
        <Link
          href="/app/games/new"
          className="mb-4 flex min-h-11 items-center gap-2 rounded-2xl bg-gold-brand px-4 text-sm font-bold text-background shadow-glow"
        >
          <Plus className="h-4 w-4" />
          New game night
        </Link>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-semibold text-muted hover:bg-elevated hover:text-cream"
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto px-3">
          <UserButton />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col lg:max-w-3xl">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-gold-brand">On the House</p>
              <p className="truncate text-sm text-muted">{host?.display_name ?? "Game night host"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GameSwitcher />
              <UserButton />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 lg:px-0 lg:pb-12 lg:pt-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold text-muted hover:bg-elevated hover:text-cream"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
