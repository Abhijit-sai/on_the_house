"use client";

import { Drama, Fingerprint } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Role, Seat } from "@/features/mafia/engine";
import { ROLES } from "@/features/mafia/script";
import { cn } from "@/lib/utils";

/**
 * Press-and-hold to see something secret; let go and it's hidden again.
 * Works for touch, mouse and keyboard, and never opens the long-press menu.
 */
export function useHold(onFirstReveal?: () => void) {
  const [held, setHeld] = useState(false);
  const [seen, setSeen] = useState(false);

  const show = () => {
    if (!held && !seen) onFirstReveal?.();
    setHeld(true);
    setSeen(true);
  };
  const hide = () => setHeld(false);

  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      show();
    },
    onPointerUp: hide,
    onPointerLeave: hide,
    onPointerCancel: hide,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        show();
      }
    },
    onKeyUp: hide,
    onBlur: hide,
  };

  return { held, seen, bind };
}

/** The role card: an identical noir back for everyone, flipping to the role while held. */
export function RoleCard({
  name,
  role,
  partners,
  revealed,
  bind,
}: {
  name: string;
  role: Role;
  partners: Seat[];
  revealed: boolean;
  bind: ReturnType<typeof useHold>["bind"];
}) {
  const meta = ROLES[role];

  return (
    <button
      type="button"
      aria-label={revealed ? `${name}, you are ${meta.label}` : "Press and hold to see your role"}
      {...bind}
      className="mx-auto block w-64 touch-none select-none [-webkit-touch-callout:none] [perspective:1100px] focus:outline-none"
    >
      <div
        className={cn(
          "relative aspect-[3/4] w-full transition-transform duration-500 [transform-style:preserve-3d]",
          revealed && "[transform:rotateY(180deg)]",
        )}
      >
        {/* back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[28px] border border-red-brand/40 bg-gradient-to-br from-[#2a0509] via-[#120204] to-black shadow-[0_12px_40px_rgba(0,0,0,0.6)] [backface-visibility:hidden]">
          <div className="absolute inset-2 rounded-[22px] border border-white/10 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.035)_0_8px,transparent_8px_16px)]" />
          <Drama className="relative h-14 w-14 text-red-danger/80" />
          <span className="relative text-xs font-bold uppercase tracking-[0.35em] text-cream/70">Your role</span>
          <span className="relative flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-cream">
            <Fingerprint className="h-4 w-4" />
            Press &amp; hold
          </span>
        </div>

        {/* face */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[28px] border-2 bg-gradient-to-br p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]",
            meta.ring,
            meta.glow,
            meta.card,
          )}
        >
          <span className="text-6xl">{meta.emoji}</span>
          <span className={cn("text-3xl font-black uppercase tracking-wide", meta.text)}>{meta.label}</span>
          <span className="text-xs leading-5 text-cream/80">{meta.brief}</span>
          {partners.length > 0 ? (
            <span className="mt-1 rounded-2xl border border-red-brand/40 bg-red-brand/15 px-3 py-2 text-xs font-bold text-red-100">
              Your family: {partners.map((p) => p.name).join(", ")}
            </span>
          ) : role === "mafia" ? (
            <span className="mt-1 text-xs font-bold text-red-100">You work alone.</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/** A small role chip for God's lists and the end-of-game cast. */
export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const meta = ROLES[role];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        meta.ring,
        meta.text,
        className,
      )}
    >
      <span className="text-xs">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

/** God's "Say:" line — the text to read out loud. */
export function SayLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-white/10 bg-white/[0.04] p-4", className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Say</p>
      <p className="mt-1 font-serif text-xl leading-snug text-cream">&ldquo;{children}&rdquo;</p>
    </div>
  );
}
