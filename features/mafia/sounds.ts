"use client";

/**
 * Mafia's sound board, built on the shared Web Audio synth.
 *
 * The one rule: nothing heard at night may carry information. While the town
 * has its eyes shut, God's taps all make the same soft click and every script
 * step the same low tick — whether it's the mafia, the doctor, the detective,
 * or a pretend call for someone already dead. The dramatic cues (a shot, a
 * save, a verdict) only play once everyone's eyes are open.
 *
 *   pass       — ding-dong: hand the phone to the next player during the deal
 *   flip       — card whoosh, identical for every role
 *   tap / step — the only night sounds; deliberately featureless
 *   nightFall  — low wind and a distant owl: eyes closed
 *   dawn       — warm rising chord: everyone wake up
 *   shot       — the night's victim
 *   saved      — the doctor got there first
 *   quiet      — nobody was touched
 *   tick / bell — the day timer's last ten seconds, and time's up
 *   drumroll   — the vote is in
 *   guilty / innocent / spared — the verdict
 *   peek       — someone needed to see their role again
 *   townWins / mafiaWins
 */

import { buzz, createSynth, master, noise, tone } from "@/lib/synth";

const synth = createSynth("oth-mafia-muted");
const audio = synth.audio;

export const isMuted = synth.isMuted;
export const setMuted = synth.setMuted;

export const sfx = {
  pass() {
    buzz([30, 60, 30]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac);
    tone(ac, out, { freq: 783.99, duration: 0.35, type: "triangle", gain: 0.28 });
    tone(ac, out, { freq: 1046.5, start: 0.16, duration: 0.5, type: "triangle", gain: 0.28 });
  },

  flip() {
    buzz(20);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.7);
    noise(ac, out, { duration: 0.22, from: 900, to: 4200, gain: 0.3 });
  },

  tap() {
    buzz(8);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.35);
    tone(ac, out, { freq: 420, duration: 0.05, type: "sine", gain: 0.2 });
  },

  step() {
    buzz(12);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.35);
    tone(ac, out, { freq: 196, duration: 0.18, type: "sine", gain: 0.3 });
  },

  nightFall() {
    buzz([60, 80, 200]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    // wind
    noise(ac, out, { duration: 2.6, from: 300, to: 900, gain: 0.12, type: "lowpass" });
    // falling drone
    tone(ac, out, { freq: 220, to: 110, duration: 2.2, type: "sawtooth", gain: 0.06, attack: 0.4 });
    tone(ac, out, { freq: 110, to: 55, duration: 2.4, type: "sine", gain: 0.3, attack: 0.3 });
    // a distant owl: hoo… hoo-hoo
    for (const [at, len] of [
      [1.1, 0.35],
      [1.6, 0.18],
      [1.82, 0.4],
    ] as const) {
      tone(ac, out, {
        freq: 392,
        to: 370,
        start: at,
        duration: len,
        type: "sine",
        gain: 0.14,
        attack: 0.06,
        vibrato: { rate: 5, depth: 4 },
      });
    }
  },

  dawn() {
    buzz([30, 40, 30]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.7);
    [261.63, 329.63, 392, 523.25].forEach((freq, i) =>
      tone(ac, out, { freq, start: i * 0.14, duration: 1.4 - i * 0.1, type: "triangle", gain: 0.14, attack: 0.25 }),
    );
    // birds
    for (const at of [0.9, 1.05, 1.4])
      tone(ac, out, { freq: 2600, to: 3400, start: at, duration: 0.08, type: "sine", gain: 0.06 });
  },

  shot() {
    buzz([200]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 1);
    noise(ac, out, { duration: 0.35, from: 4000, to: 200, gain: 0.9, type: "lowpass" });
    tone(ac, out, { freq: 90, to: 40, duration: 0.5, type: "sine", gain: 0.7 });
    // echo
    noise(ac, out, { start: 0.32, duration: 0.5, from: 1200, to: 150, gain: 0.18, type: "lowpass" });
  },

  saved() {
    buzz([40, 40, 120]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.75);
    [659.25, 830.61, 987.77, 1318.51].forEach((freq, i) =>
      tone(ac, out, { freq, start: i * 0.07, duration: 0.8, type: "sine", gain: 0.16 }),
    );
  },

  quiet() {
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.6);
    tone(ac, out, { freq: 523.25, duration: 0.9, type: "sine", gain: 0.18, attack: 0.1 });
    tone(ac, out, { freq: 659.25, start: 0.2, duration: 0.9, type: "sine", gain: 0.14, attack: 0.1 });
  },

  tick() {
    buzz(10);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.6);
    tone(ac, out, { freq: 1200, duration: 0.05, type: "square", gain: 0.08 });
  },

  bell() {
    buzz([300, 100, 300]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.9);
    for (const at of [0, 0.6]) {
      tone(ac, out, { freq: 880, start: at, duration: 1.2, type: "sine", gain: 0.25 });
      tone(ac, out, { freq: 1760, start: at, duration: 0.8, type: "sine", gain: 0.08 });
    }
  },

  drumroll() {
    buzz([40, 40, 40, 40, 40, 40, 80]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    for (let i = 0; i < 22; i += 1)
      noise(ac, out, { start: i * 0.055, duration: 0.08, from: 300, to: 180, gain: 0.22 + i * 0.012 });
  },

  guilty() {
    buzz([60, 40, 60, 40, 220]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.85);
    tone(ac, out, { freq: 70, to: 45, duration: 0.5, type: "sine", gain: 0.7 });
    [523.25, 622.25, 783.99, 1046.5].forEach((freq, i) =>
      tone(ac, out, { freq, start: 0.15 + i * 0.08, duration: 0.6, type: "triangle", gain: 0.2 }),
    );
  },

  innocent() {
    buzz(320);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.8);
    tone(ac, out, { freq: 70, to: 45, duration: 0.5, type: "sine", gain: 0.6 });
    [392, 349.23, 311.13].forEach((freq, i) =>
      tone(ac, out, { freq, start: 0.2 + i * 0.36, duration: 0.5, type: "sawtooth", gain: 0.1, attack: 0.05 }),
    );
  },

  spared() {
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.6);
    tone(ac, out, { freq: 440, duration: 0.3, type: "triangle", gain: 0.18 });
    tone(ac, out, { freq: 440, start: 0.35, duration: 0.5, type: "triangle", gain: 0.14 });
  },

  peek() {
    buzz([120, 80, 120]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.9);
    for (const at of [0, 0.45]) {
      tone(ac, out, {
        freq: 622.25,
        start: at,
        duration: 0.2,
        type: "square",
        gain: 0.12,
        vibrato: { rate: 14, depth: 18 },
      });
      tone(ac, out, {
        freq: 523.25,
        start: at + 0.2,
        duration: 0.24,
        type: "square",
        gain: 0.12,
        vibrato: { rate: 14, depth: 18 },
      });
    }
  },

  townWins() {
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.7);
    const notes: [number, number, number][] = [
      [523.25, 0, 0.18],
      [523.25, 0.2, 0.18],
      [523.25, 0.4, 0.18],
      [659.25, 0.6, 0.5],
      [783.99, 1.1, 0.9],
    ];
    for (const [freq, start, duration] of notes) tone(ac, out, { freq, start, duration, type: "triangle", gain: 0.22 });
  },

  mafiaWins() {
    buzz([400, 100, 400]);
    const ac = audio();
    if (!ac) return;
    const out = master(ac, 0.9);
    [98, 116.54, 146.83].forEach((freq) =>
      tone(ac, out, { freq, duration: 2.2, type: "sawtooth", gain: 0.1, attack: 0.3, vibrato: { rate: 4, depth: 3 } }),
    );
    tone(ac, out, { freq: 49, duration: 2.2, type: "sine", gain: 0.45, attack: 0.2 });
  },
};

export type SoundName = keyof typeof sfx;
