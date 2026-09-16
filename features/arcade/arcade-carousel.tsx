"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Drama, Flame, Lock, Spade, VenetianMask, Volleyball } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export type ArcadeGame = {
  id: string;
  title: string;
  tagline: string;
  href: string | null; // null = coming soon
  image: string;
  icon: "spade" | "flame" | "mask" | "ball" | "drama";
  accent: "gold" | "red";
  status: string | null;
};

const icons: Record<ArcadeGame["icon"], ComponentType<{ className?: string }>> = {
  spade: Spade,
  flame: Flame,
  mask: VenetianMask,
  ball: Volleyball,
  drama: Drama,
};

const accents = {
  gold: { text: "text-gold-brand", chip: "bg-gold-brand text-background", glow: "shadow-[0_0_60px_rgba(245,185,66,0.35)]" },
  red: { text: "text-red-danger", chip: "bg-red-brand text-white", glow: "shadow-[0_0_60px_rgba(215,38,56,0.4)]" },
};

/** How long each card holds the spotlight before the carousel moves on. */
export const ARCADE_DWELL_MS = 3500;

const CARD_W = 280;
const GAP = 20;

/** Shortest signed distance from the active card around the loop. */
function loopOffset(index: number, active: number, count: number) {
  let d = index - active;
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  return d;
}

function GameCard({
  game,
  isActive,
  runKey,
  paused,
  onFinished,
  priority,
}: {
  game: ArcadeGame;
  isActive: boolean;
  runKey: number;
  paused: boolean;
  onFinished: () => void;
  priority: boolean;
}) {
  const Icon = icons[game.icon];
  const accent = accents[game.accent];
  const playable = game.href !== null;

  return (
    <div
      className={cn(
        "relative h-[420px] w-[280px] select-none overflow-hidden rounded-[24px] ring-1 transition-shadow duration-500",
        isActive ? cn("ring-white/15", playable && accent.glow) : "ring-border",
      )}
    >
      <Image
        src={game.image}
        alt=""
        fill
        sizes="280px"
        priority={priority}
        draggable={false}
        className={cn(
          "object-cover transition-transform duration-700",
          isActive && "scale-105",
          !playable && "saturate-50",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {game.status ? (
        <span className="absolute left-4 top-4 rounded-full border border-border bg-black/70 px-3 py-1 text-[11px] font-bold text-cream backdrop-blur">
          {game.status}
        </span>
      ) : null}

      {!playable ? (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-border bg-black/70 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted backdrop-blur">
          <Lock className="h-3 w-3" />
          Soon
        </span>
      ) : null}

      {/* bottom stack: icon → name → one-liner */}
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 pb-6">
        <span
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/60 backdrop-blur",
            accent.text,
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        <h2 className="text-2xl font-black leading-tight text-white drop-shadow">{game.title}</h2>
        <p className="text-sm font-medium leading-5 text-cream/80">{game.tagline}</p>
        {playable && isActive ? (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black", accent.chip)}>
            Play
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>

      {/* The dwell timeline. Its animation *is* the timer: when it finishes the
          carousel advances, so pausing the bar pauses the carousel. */}
      {isActive ? (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/10" aria-hidden>
          <div
            key={runKey}
            onAnimationEnd={onFinished}
            className="arcade-progress h-full rounded-r-full bg-gradient-to-r from-gold-brand via-[#ff7a2f] to-red-brand shadow-[0_0_12px_rgba(245,185,66,0.8)]"
            style={{ animationDuration: `${ARCADE_DWELL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function ArcadeCarousel({ games }: { games: ArcadeGame[] }) {
  const count = games.length;
  const [active, setActive] = useState(0);
  // Bumped on every move so the timeline restarts from zero, even when the
  // same card index comes round again.
  const [runKey, setRunKey] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Remember each card's last offset so a card wrapping from one end of the
  // loop to the other teleports instead of flying across the screen.
  const lastOffsets = useRef<Map<string, number>>(new Map());

  const go = useCallback(
    (step: number) => {
      setActive((current) => (current + step + count) % count);
      setRunKey((k) => k + 1);
    },
    [count],
  );

  const goTo = useCallback((index: number) => {
    setActive(index);
    setRunKey((k) => k + 1);
  }, []);

  const offsets = games.map((game, index) => ({ game, index, offset: loopOffset(index, active, count) }));

  useEffect(() => {
    for (const { game, offset } of offsets) lastOffsets.current.set(game.id, offset);
  });

  const paused = hovered || focusWithin;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Games"
      className="relative -mx-4 lg:-mx-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;

        if (start === null || end === undefined) return;
        if (Math.abs(end - start) > 40) go(end < start ? 1 : -1);
      }}
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-background to-transparent lg:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-background to-transparent lg:w-28" />

      <div className="relative h-[468px] overflow-hidden">
        {offsets.map(({ game, index, offset }) => {
          const distance = Math.abs(offset);
          const previous = lastOffsets.current.get(game.id);
          const wrapped = previous !== undefined && Math.abs(previous - offset) > 1;
          const isActive = offset === 0;
          const inner = (
            <GameCard
              game={game}
              isActive={isActive}
              runKey={runKey}
              paused={paused}
              onFinished={() => go(1)}
              priority={distance <= 1}
            />
          );

          return (
            <div
              key={game.id}
              aria-hidden={!isActive}
              className="absolute left-1/2 top-6"
              style={{
                width: CARD_W,
                marginLeft: -CARD_W / 2,
                transform: `translateX(${offset * (CARD_W + GAP)}px) scale(${isActive ? 1 : 0.9})`,
                opacity: distance > 2 ? 0 : distance === 2 ? 0.35 : isActive ? 1 : 0.6,
                zIndex: 10 - distance,
                transition: wrapped
                  ? "none"
                  : "transform 600ms cubic-bezier(0.22, 1, 0.36, 1), opacity 600ms ease",
              }}
            >
              {isActive && game.href ? (
                <Link href={game.href} prefetch aria-label={`Play ${game.title}`} className="block rounded-[24px]">
                  {inner}
                </Link>
              ) : isActive ? (
                <div aria-label={`${game.title}, coming soon`}>{inner}</div>
              ) : (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => goTo(index)}
                  aria-label={`Show ${game.title}`}
                  className="block w-full cursor-pointer rounded-[24px] text-left"
                >
                  {inner}
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous game"
          className="absolute left-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-cream backdrop-blur transition hover:border-gold-brand/60 hover:text-gold-brand active:scale-95 lg:left-8"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next game"
          className="absolute right-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/70 text-cream backdrop-blur transition hover:border-gold-brand/60 hover:text-gold-brand active:scale-95 lg:right-8"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* position */}
      <div className="flex items-center justify-center gap-2 pt-1">
        {games.map((game, index) => (
          <button
            key={game.id}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Go to ${game.title}`}
            aria-current={index === active}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === active ? "w-6 bg-gold-brand" : "w-2 bg-white/25 hover:bg-white/40",
            )}
          />
        ))}
      </div>
    </section>
  );
}
