"use client";

/**
 * Imposter's sound board — synthesised on the fly with Web Audio, so there are
 * no files to load and it works offline. Every cue is built to be told apart
 * across a noisy room:
 *
 *   pick     — paper swish + soft thump: a card leaves the deck
 *   reveal   — rising shimmer: your word flips up
 *   pass     — bright ding-dong: hand the phone to the next person
 *   peek     — suspicious two-tone "uh-oh" warble, twice: someone is re-reading
 *              their card, and the whole table should know it
 *   tick     — short blip: next clue-giver
 *   drumroll — tension before a vote result
 *   civilian — sad wah-wah: the table got it wrong
 *   caught   — triumphant arpeggio: an imposter is out
 *   imposterWins — low sinister chord
 *   fanfare  — the game's over, scores are in
 *
 * Sounds only play after a tap (browsers need a gesture to start audio), and
 * everything respects the mute toggle.
 */

import { buzz, createSynth, master, noise, tone } from "@/lib/synth";

const synth = createSynth("oth-imposter-muted");
const audio = synth.audio;

export const isMuted = synth.isMuted;
export const setMuted = synth.setMuted;

export const sfx = {
  pick() {
    buzz(15);
    const ac = audio();
    if (!ac) return;
    const out = master(ac);
    noise(ac, out, { duration: 0.18, from: 1800, to: 5200, gain: 0.35 });
    tone(ac, out, { freq: 180, to: 90, start: 0.12, duration: 0.14, type: "triangle", gain: 0.35 });
  },

  reveal() {
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.7);
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      tone(ac, out, { freq, start: i * 0.06, duration: 0.5, type: "sine", gain: 0.18 }),
    );
  },

  pass() {
    buzz([30, 60, 30]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac);
    tone(ac, out, { freq: 987.77, duration: 0.35, type: "triangle", gain: 0.3 });
    tone(ac, out, { freq: 1318.51, start: 0.16, duration: 0.55, type: "triangle", gain: 0.3 });
  },

  peek() {
    buzz([120, 80, 120, 80, 120]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 1);
    // "uh-oh… uh-oh": a wobbly square-wave minor third, twice, impossible to miss.
    for (const at of [0, 0.5]) {
      tone(ac, out, { freq: 622.25, start: at, duration: 0.2, type: "square", gain: 0.14, vibrato: { rate: 14, depth: 18 } });
      tone(ac, out, { freq: 523.25, start: at + 0.2, duration: 0.26, type: "square", gain: 0.14, vibrato: { rate: 14, depth: 18 } });
    }
  },

  tick() {
    buzz(10);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.6);
    tone(ac, out, { freq: 880, to: 1320, duration: 0.09, type: "sine", gain: 0.25 });
  },

  drumroll() {
    buzz([40, 40, 40, 40, 40, 40, 80]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    for (let i = 0; i < 18; i += 1) noise(ac, out, { start: i * 0.055, duration: 0.08, from: 300, to: 180, gain: 0.25 + i * 0.012 });
    tone(ac, out, { freq: 70, to: 45, start: 1.0, duration: 0.4, type: "sine", gain: 0.6 });
  },

  civilian() {
    buzz(300);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    // wah… wah… wah… waaah
    [392, 369.99, 349.23].forEach((freq, i) =>
      tone(ac, out, { freq, start: i * 0.38, duration: 0.34, type: "sawtooth", gain: 0.12, attack: 0.05 }),
    );
    tone(ac, out, { freq: 329.63, to: 311.13, start: 1.14, duration: 0.9, type: "sawtooth", gain: 0.12, attack: 0.05, vibrato: { rate: 6, depth: 6 } });
  },

  caught() {
    buzz([60, 40, 60, 40, 200]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) =>
      tone(ac, out, { freq, start: i * 0.09, duration: 0.45, type: "triangle", gain: 0.22 }),
    );
    tone(ac, out, { freq: 1046.5, start: 0.5, duration: 0.9, type: "triangle", gain: 0.2 });
  },

  imposterWins() {
    buzz([400, 100, 400]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.9);
    [110, 130.81, 155.56].forEach((freq) =>
      tone(ac, out, { freq, duration: 1.8, type: "sawtooth", gain: 0.1, attack: 0.3, vibrato: { rate: 4, depth: 3 } }),
    );
    tone(ac, out, { freq: 55, duration: 1.8, type: "sine", gain: 0.4, attack: 0.2 });
  },

  fanfare() {
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.7);
    const notes: [number, number, number][] = [
      [523.25, 0, 0.18],
      [523.25, 0.2, 0.18],
      [523.25, 0.4, 0.18],
      [659.25, 0.6, 0.5],
      [783.99, 1.1, 0.8],
    ];
    for (const [freq, start, duration] of notes) tone(ac, out, { freq, start, duration, type: "triangle", gain: 0.22 });
  },
};

export type SoundName = keyof typeof sfx;
