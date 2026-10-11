"use client";
import { useEffect, useState } from "react";

const KEY = "airavat-awakened";
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({ dx: `${Math.round(Math.cos((i / 28) * Math.PI * 2) * (180 + (i % 5) * 40))}px`, dy: `${Math.round(Math.sin((i / 28) * Math.PI * 2) * (180 + (i % 7) * 30))}px`, delay: `${(i % 6) * 0.08}s` }));

// "The Awakening": a short cinematic reveal on first visit per session. Skippable, never blocks, hidden for reduced motion.
export default function Awakening() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = true;
    try { seen = sessionStorage.getItem(KEY) === "1"; } catch { seen = true; }
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) return;
    // Scheduling the reveal in a timer keeps the first paint identical between server and client.
    const t = setTimeout(() => setShow(true), 0);
    const done = setTimeout(() => dismiss(), 3200);
    return () => { clearTimeout(t); clearTimeout(done); };
  }, []);
  function dismiss() { try { sessionStorage.setItem(KEY, "1"); } catch { /* storage unavailable */ } setShow(false); }
  if (!show) return null;
  return (
    <div className="awaken" aria-hidden="true" onClick={dismiss}>
      {PARTICLES.map((p, i) => <span key={i} className="particle" style={{ "--dx": p.dx, "--dy": p.dy, animationDelay: p.delay } as React.CSSProperties} />)}
      <div className="relative text-center">
        <svg className="emblem mx-auto" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="#d4b46a" strokeWidth="2">
          <circle cx="60" cy="60" r="52" />
          <path d="M30 80 L60 28 L90 80 Z" />
          <path d="M44 80 L60 52 L76 80" />
          <circle cx="60" cy="60" r="6" />
        </svg>
        <div className="font-display mt-4 text-sm font-semibold tracking-[0.4em] text-[#f3efe4]">AIRAVAT</div>
        <div className="mt-1 text-[11px] tracking-[0.3em] text-[#a7afc6]">POWER WITH PRECISION</div>
        <button type="button" className="mt-6 text-[11px] text-[#a7afc6] underline" onClick={dismiss}>Skip intro</button>
      </div>
    </div>
  );
}
