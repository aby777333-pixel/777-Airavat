"use client";
import { useEffect, useState } from "react";

// Lesson completion stored per browser (no account needed).
export function markDone(track: string, lesson: string) {
  try { const k = `airavat-track-${track}`; const s = new Set(JSON.parse(localStorage.getItem(k) || "[]") as string[]); s.add(lesson); localStorage.setItem(k, JSON.stringify([...s])); window.dispatchEvent(new CustomEvent("airavat:track")); } catch { /* storage unavailable */ }
}
export default function TrackProgress({ track, total }: { track: string; total: number }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const read = () => { try { setDone((JSON.parse(localStorage.getItem(`airavat-track-${track}`) || "[]") as string[]).length); } catch { /* ignore */ } };
    const id = window.setTimeout(read, 0); window.addEventListener("airavat:track", read);
    return () => { window.clearTimeout(id); window.removeEventListener("airavat:track", read); };
  }, [track]);
  return (
    <div className="mt-3"><div className="flex justify-between text-xs text-muted"><span>Progress</span><span>{done} / {total}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg"><div className="h-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div></div>
  );
}
