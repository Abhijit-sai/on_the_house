import { UserButton } from "@clerk/nextjs";
import { History, Home, Settings, Users } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
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
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background text-cream">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-gold-brand">On the House</p>
            <p className="text-sm text-muted">{host?.display_name ?? "Game night host"}</p>
          </div>
          <UserButton />
        </div>
      </header>
      <main className="px-4 pb-28 pt-4">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
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
