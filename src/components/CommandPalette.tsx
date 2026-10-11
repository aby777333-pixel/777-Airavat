"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type R = { kind: string; title: string; subtitle?: string; href: string };

// AIRAVAT Command Everywhere — Ctrl/Cmd+K. Deterministic routing via /api/search; AI fallback hands off to AIRAVAT LIVE.
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<R[]>([]);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Closing resets the query so the next open starts clean; done in the handler, not in an effect.
  const setOpenReset = useCallback((next: boolean | ((o: boolean) => boolean)) => {
    setOpen((o) => { const v = typeof next === "function" ? next(o) : next; if (!v) { setQ(""); setResults([]); setSel(0); } return v; });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpenReset((o) => !o); }
      if (e.key === "Escape") setOpenReset(false);
    };
    window.addEventListener("keydown", onKey);
    const onOpen = () => setOpenReset(true);
    window.addEventListener("airavat:command", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("airavat:command", onOpen); };
  }, [setOpenReset]);
  useEffect(() => { if (open) { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setBusy(true);
      try { const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`); const d = await r.json(); setResults(d.results ?? []); setSel(0); } catch { setResults([]); } finally { setBusy(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(r: R) { setOpenReset(false); router.push(r.href); }
  function askLive() { setOpenReset(false); window.dispatchEvent(new CustomEvent("airavat:live", { detail: { question: q } })); }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-4 pt-[12vh]" onClick={() => setOpenReset(false)} role="dialog" aria-label="Command palette">
      <div className="glass-strong w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="text-accent">⌘</span>
          <input ref={inputRef} className="w-full bg-transparent text-base outline-none" placeholder="Type a page, tool, symbol or question…" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); } if (e.key === "Enter") { if (results[sel]) go(results[sel]); else if (q.trim()) askLive(); } }} aria-label="Command" />
          <kbd className="rounded border border-border px-1.5 text-[10px] text-faint">ESC</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {results.map((r, i) => (
            <li key={`${r.href}-${i}`} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(r)} className={clsx("flex cursor-pointer items-center gap-3 px-4 py-2 text-sm", i === sel ? "bg-accent/15" : "")}>
              <span className="badge shrink-0">{r.kind}</span><span className="font-medium">{r.title}</span>{r.subtitle && <span className="truncate text-xs text-muted">{r.subtitle}</span>}
            </li>
          ))}
          {!busy && q.trim() && results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No direct match. Press Enter to ask AIRAVAT LIVE.</li>}
          {!q.trim() && <li className="px-4 py-3 text-xs text-faint">Try: “brokerage charges”, “RELIANCE”, “scanner”, “open research”, “what changed today”.</li>}
        </ul>
        {q.trim() && <button className="w-full border-t border-border px-4 py-2 text-left text-xs text-accent hover:bg-accent/10" onClick={askLive}>Ask AIRAVAT LIVE: “{q}”</button>}
      </div>
    </div>
  );
}

export function CommandButton({ className }: { className?: string }) {
  return (
    <button className={clsx("btn btn-ghost btn-sm", className)} onClick={() => window.dispatchEvent(new CustomEvent("airavat:command"))} aria-label="Open command palette">
      Search <kbd className="ml-1 rounded border border-border px-1 text-[10px] text-faint">⌘K</kbd>
    </button>
  );
}
