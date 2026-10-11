"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { watchlist, WATCHLIST_EVENT } from "@/lib/public-watchlist";

// Star toggle for visitors: writes the browser watchlist and links to the public watchlist page.
export default function WatchButton({ symbol }: { symbol: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => { const read = () => setOn(watchlist.has(symbol)); const id = window.setTimeout(read, 0); window.addEventListener(WATCHLIST_EVENT, read); return () => { window.clearTimeout(id); window.removeEventListener(WATCHLIST_EVENT, read); }; }, [symbol]);
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" onClick={() => setOn(watchlist.toggle(symbol))} className={on ? "btn btn-primary" : "btn btn-ghost"} aria-pressed={on} aria-label={on ? `Remove ${symbol} from browser watchlist` : `Add ${symbol} to browser watchlist`}>{on ? "★ Watching" : "☆ Watch"}</button>
      {on && <Link href="/markets/watchlist" className="text-xs text-accent hover:underline">list</Link>}
    </span>
  );
}
