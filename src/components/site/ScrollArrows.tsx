"use client";
import { useEffect, useState } from "react";

// Floating scroll controls: jump to the top or the bottom of long pages. Hidden until the page has scrolled.
export default function ScrollArrows() {
  const [state, setState] = useState<{ atTop: boolean; atBottom: boolean }>({ atTop: true, atBottom: false });
  useEffect(() => {
    const onScroll = () => { const y = window.scrollY; const max = document.documentElement.scrollHeight - window.innerHeight; setState({ atTop: y < 240, atBottom: max - y < 240 }); };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  if (state.atTop && state.atBottom) return null;
  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col gap-1.5" aria-label="Scroll controls">
      <button type="button" aria-label="Scroll to top" disabled={state.atTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-solid text-lg shadow-lg transition hover:border-accent disabled:opacity-30">↑</button>
      <button type="button" aria-label="Scroll to bottom" disabled={state.atBottom} onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })} className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface-solid text-lg shadow-lg transition hover:border-accent disabled:opacity-30">↓</button>
    </div>
  );
}
