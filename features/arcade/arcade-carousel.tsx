"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Flame, Lock, Spade, VenetianMask, Volleyball, Drama } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
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
  gold: {
    ring: "group-hover:ring-gold-brand/70",
    text: "text-gold-brand",
    chip: "bg-gold-brand text-background",
    glow: "group-hover:shadow-[0_0_60px_rgba(245,185,66,0.35)]",
  },
  red: {
    ring: "group-hover:ring-red-brand/70",
    text: "text-red-danger",
    chip: "bg-red-brand text-white",
    glow: "group-hover:shadow-[0_0_60px_rgba(215,38,56,0.4)]",
  },
};

function GameCard({ game, priority }: { game: ArcadeGame; priority?: boolean }) {
  const router = useRouter();
  const Icon = icons[game.icon];
  const accent = accents[game.accent];
  const playable = game.href !== null;

  const card = (
    <div
      className={cn(
        "group relative h-[420px] w-[280px] shrink-0 select-none overflow-hidden rounded-[24px] ring-1 ring-border transition-all duration-300",
        playable ? cn("cursor-pointer hover:-translate-y-3", accent.ring, accent.glow) : "opacity-80",
      )}
    >
      <Image
        src={game.image}
        alt={game.title}
        fill
        sizes="280px"
        priority={priority}
        className={cn(
          "object-cover transition-transform duration-500",
          playable ? "group-hover:scale-105" : "saturate-50",
        )}
        draggable={false}
      />

      {/* legibility gradient */}
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
      <div className="absolute inset-x-0 bottom-0 space-y-2 p-5">
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
        {playable ? (
          <span
            className={cn(
              "inline-flex translate-y-1 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
              accent.chip,
            )}
          >
            Play
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (!playable) return card;

  return (
    <Link href={game.href!} prefetch onMouseEnter={() => router.prefetch(game.href!)} className="shrink-0">
      {card}
    </Link>
  );
}

export function ArcadeCarousel({ games }: { games: ArcadeGame[] }) {
  const reducedMotion = useReducedMotion();

  // Two copies back-to-back; the track animates -50% and snaps invisibly.
  const loop = [...games, ...games];

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative -mx-4 lg:-mx-10"
    >
      {/* edge fades for the endless feel */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent lg:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent lg:w-24" />

      {reducedMotion ? (
        <div className="flex gap-5 overflow-x-auto px-4 py-6 lg:px-10">
          {games.map((game) => (
            <GameCard key={game.id} game={game} priority />
          ))}
        </div>
      ) : (
        <div className="group/track overflow-hidden py-6">
          <div className="arcade-track flex w-max gap-5 pr-5">
            {loop.map((game, index) => (
              <GameCard key={`${game.id}-${index}`} game={game} priority={index < games.length} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
