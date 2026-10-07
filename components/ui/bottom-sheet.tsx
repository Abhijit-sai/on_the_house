"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The part of the screen the keyboard isn't covering. Mobile browsers open the
 * keyboard over the page without resizing it, so a sheet pinned to the bottom
 * ends up underneath it. While the keyboard is up, the sheet sizes itself to
 * the visible area instead — search field, suggestions and the Save button all
 * stay above the keys.
 */
function useVisibleViewport(active: boolean) {
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;

    const update = () => {
      const keyboardUp = window.innerHeight - vv.height > 80;
      setViewport(keyboardUp ? { top: vv.offsetTop, height: vv.height } : null);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setViewport(null);
    };
  }, [active]);

  return viewport;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const viewport = useVisibleViewport(open);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-x-0 z-50 mx-auto flex max-w-md flex-col justify-end"
      style={viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={viewport ? { maxHeight: viewport.height - 8 } : undefined}
        className={cn(
          "sheet-up relative max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border border-b-0 border-border bg-surface px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3",
          className,
        )}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-center justify-between">
          {title ? <h2 className="text-lg font-bold text-white">{title}</h2> : <span />}
          <button
            type="button"
            aria-label="Close sheet"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
