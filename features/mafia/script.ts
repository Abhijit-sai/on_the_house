import type { NightRole, Role } from "@/features/mafia/engine";

/**
 * Everything God reads out loud, plus how each role looks on its card. The
 * night lines are fixed so a God who's never narrated can just read them;
 * the dawn and verdict lines rotate so the story never gets stale.
 */

export type RoleMeta = {
  label: string;
  emoji: string;
  /** Tailwind classes for text / ring / glow in this role's colour. */
  text: string;
  ring: string;
  glow: string;
  card: string;
  brief: string;
};

export const ROLES: Record<Role, RoleMeta> = {
  mafia: {
    label: "Mafia",
    emoji: "🔪",
    text: "text-red-danger",
    ring: "border-red-brand/70",
    glow: "shadow-[0_0_60px_rgba(215,38,56,0.55)]",
    card: "from-[#3a0710] via-[#1a0306] to-black",
    brief:
      "Each night, agree with the family on one person to kill. By day, blend in. Win when you match the town head for head.",
  },
  doctor: {
    label: "Doctor",
    emoji: "🩺",
    text: "text-emerald-300",
    ring: "border-emerald-400/60",
    glow: "shadow-[0_0_60px_rgba(52,211,153,0.4)]",
    card: "from-[#052e22] via-[#03170f] to-black",
    brief:
      "Each night, protect one person from the mafia. Never the same person two nights running — and God will tell you if you can save yourself.",
  },
  detective: {
    label: "Detective",
    emoji: "🕵️",
    text: "text-gold-brand",
    ring: "border-gold-brand/60",
    glow: "shadow-[0_0_60px_rgba(245,185,66,0.4)]",
    card: "from-[#2f2206] via-[#171003] to-black",
    brief: "Each night, point at one person. God shows a thumbs up if they're mafia. Use what you learn — carefully.",
  },
  villager: {
    label: "Villager",
    emoji: "🏡",
    text: "text-cream",
    ring: "border-cream/40",
    glow: "shadow-[0_0_60px_rgba(255,244,214,0.18)]",
    card: "from-[#262019] via-[#13100c] to-black",
    brief: "You sleep through the night. By day, read the room, argue, and vote the mafia out before they get you.",
  },
};

export const SLEEP_LINE = "Night falls on the town. Everyone, close your eyes.";
export const WAKE_LINE = "Everyone… open your eyes.";

export const NIGHT_LINES: Record<NightRole, { open: string; ask: string; close: string; done: string }> = {
  mafia: {
    open: "Mafia, open your eyes. Look at each other.",
    ask: "Who do you want to kill tonight?",
    close: "Mafia, close your eyes.",
    done: "Mafia's eyes are closed",
  },
  doctor: {
    open: "Doctor, open your eyes.",
    ask: "Who will you save tonight?",
    close: "Doctor, close your eyes.",
    done: "Doctor's eyes are closed",
  },
  detective: {
    open: "Detective, open your eyes.",
    ask: "Who do you want to know about?",
    close: "Detective, close your eyes.",
    done: "Detective's eyes are closed",
  },
};

const KILL_LINES = [
  "{name} was found face-down in the biryani.",
  "{name} stepped out for chai and never came back.",
  "{name} answered a call from an unknown number. It was the last one.",
  "They found {name}'s chappals outside the door. Just the chappals.",
  "{name} sleeps with the fishes tonight.",
  "{name} was last seen arguing over the AC remote.",
  "The auto-wala waited for {name}. {name} never showed.",
  "{name} has been permanently removed from the group chat.",
  "{name} said “just five more minutes” and meant it this time.",
  "Somebody left a horse's head in {name}'s bed. It didn't end well.",
];

const SAVE_LINES = [
  "The mafia came for someone last night — but the doctor got there first.",
  "Shots in the dark. Somebody woke up very, very lucky.",
  "A knock at the door, a scuffle, and then… nothing. The doctor was on call.",
];

const QUIET_LINES = [
  "A strangely peaceful night. Nobody was touched.",
  "The family stayed home last night. Nobody died.",
];

const GUILTY_LINES = ["The town got one.", "Caught red-handed.", "One less in the family."];
const INNOCENT_LINES = ["The town has blood on its hands.", "Wrong call. The mafia is smiling.", "Oops."];
const SPARED_LINES = [
  "The town couldn't agree. Everyone lives… for now.",
  "No majority. The mafia breathes easy tonight.",
];

/** A stable pick per game and moment, so a refresh shows the same line. */
function pick(lines: readonly string[], seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(h) % lines.length];
}

const fill = (line: string, name: string) => line.split("{name}").join(name);

export const lines = {
  kill: (seed: string, name: string) => fill(pick(KILL_LINES, seed), name),
  saved: (seed: string) => pick(SAVE_LINES, seed),
  quiet: (seed: string) => pick(QUIET_LINES, seed),
  guilty: (seed: string) => pick(GUILTY_LINES, seed),
  innocent: (seed: string) => pick(INNOCENT_LINES, seed),
  spared: (seed: string) => pick(SPARED_LINES, seed),
};
