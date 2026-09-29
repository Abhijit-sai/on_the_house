"use client";

import type { GameState } from "@/features/imposter/engine";

/**
 * The game in progress lives on the phone being passed around — every tap is
 * instant and a refresh (or a locked screen) never loses the deal. Only the
 * finished game goes to the server.
 */
const key = (roomId: string) => `oth-imposter-game:${roomId}`;

export function loadGame(roomId: string): GameState | null {
  try {
    const raw = window.localStorage.getItem(key(roomId));
    if (!raw) return null;
    const game = JSON.parse(raw) as GameState;
    return game?.version === 1 && game.roomId === roomId ? game : null;
  } catch {
    return null;
  }
}

export function storeGame(game: GameState) {
  try {
    window.localStorage.setItem(key(game.roomId), JSON.stringify(game));
  } catch {
    // storage full or blocked — the game still plays, it just won't survive a refresh
  }
}

export function clearGame(roomId: string) {
  try {
    window.localStorage.removeItem(key(roomId));
  } catch {
    // nothing to clear
  }
}

/** Card shuffles and first speakers come from the platform CSPRNG, not Math.random. */
export function secureRng() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export function newGameId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
