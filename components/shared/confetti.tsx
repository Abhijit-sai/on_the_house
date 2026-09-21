"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * A one-shot canvas confetti burst that fills its positioned parent. Drop it in a
 * `relative` container and set `fire` true once — it plays a ~1.5s burst and stops.
 * Honours prefers-reduced-motion by rendering nothing.
 */
export function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!fire || reduced) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.offsetWidth || 320;
    const h = canvas.offsetHeight || 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const colors = ["#f5b942", "#ff9d3c", "#ff5e87", "#4ecb7d", "#fbf7ee"];
    const LIFE = 96;
    const parts = Array.from({ length: 90 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.35,
      y: h * 0.32 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 6.5,
      vy: Math.random() * -7 - 2.5,
      g: 0.17 + Math.random() * 0.1,
      s: 4 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.32,
      color: colors[(Math.random() * colors.length) | 0],
    }));

    let raf = 0;
    let t = 0;
    function frame() {
      t += 1;
      ctx!.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.globalAlpha = Math.max(0, 1 - t / LIFE);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
        ctx!.restore();
      }
      if (t < LIFE) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fire, reduced]);

  if (reduced) return null;
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
