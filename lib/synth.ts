"use client";

/**
 * A tiny Web Audio synth for game sound boards — every cue is synthesised on
 * the fly, so there are no files to load and it works offline. Each game gets
 * its own instance (and its own remembered mute switch).
 *
 * Sounds only play after a tap (browsers need a gesture to start audio).
 */

export type ToneOpts = {
  freq: number;
  to?: number;
  start?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  vibrato?: { rate: number; depth: number };
};

export type NoiseOpts = {
  start?: number;
  duration: number;
  gain?: number;
  from: number;
  to: number;
  type?: BiquadFilterType;
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!ctx) {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }

  if (ctx.state === "suspended") void ctx.resume();

  return ctx;
}

export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // no haptics — fine
  }
}

export function tone(ac: AudioContext, out: AudioNode, o: ToneOpts) {
  const t0 = ac.currentTime + (o.start ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();

  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + o.duration);

  if (o.vibrato) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = o.vibrato.rate;
    depth.gain.value = o.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + o.duration + 0.05);
  }

  const peak = o.gain ?? 0.25;
  const attack = o.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);

  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + o.duration + 0.05);
}

export function noise(ac: AudioContext, out: AudioNode, o: NoiseOpts) {
  const t0 = ac.currentTime + (o.start ?? 0);
  const length = Math.ceil(ac.sampleRate * o.duration);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = o.type ?? "bandpass";
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(o.from, t0);
  filter.frequency.exponentialRampToValueAtTime(o.to, t0 + o.duration);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t0 + o.duration * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.duration);

  src.connect(filter).connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + o.duration + 0.05);
}

export function master(ac: AudioContext, volume = 0.9) {
  const g = ac.createGain();
  g.gain.value = volume;
  g.connect(ac.destination);
  return g;
}

/** A game's own mute switch, remembered on this phone. `audio()` is null while muted. */
export function createSynth(muteKey: string) {
  let muted: boolean | null = null;

  function isMuted() {
    if (muted === null) {
      try {
        muted = window.localStorage.getItem(muteKey) === "1";
      } catch {
        muted = false;
      }
    }
    return muted;
  }

  function setMuted(value: boolean) {
    muted = value;
    try {
      window.localStorage.setItem(muteKey, value ? "1" : "0");
    } catch {
      // private mode — the choice just won't persist
    }
  }

  function audio() {
    if (typeof window === "undefined" || isMuted()) return null;
    return context();
  }

  return { isMuted, setMuted, audio };
}
