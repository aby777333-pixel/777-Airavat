"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { alerts as alertStore, watchlist as wlStore, WATCHLIST_EVENT, type LocalAlert } from "@/lib/public-watchlist";
import { migrateWatchlist, type MigrateResult } from "./actions";

type Universe = { symbol: string; name: string; segment: string }[];
type Q = { symbol: string; name: string; segment: string; ltp: number; prev_close: number; high: number; low: number; volume: number; updated_at: string | null; stale?: boolean };
const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DEFAULTS = ["NIFTY 50", "NIFTY BANK", "RELIANCE", "TCS", "HDFCBANK", "INFY"];

export default function PublicWatchlist({ universe, signedIn, wantsMigrate }: { universe: Universe; signedIn: boolean; wantsMigrate: boolean }) {
  const [symbols, setSymbols] = useState<string[] | null>(null);
  const [alerts, setAlerts] = useState<LocalAlert[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [q, setQ] = useState("");
  const [fired, setFired] = useState<LocalAlert[]>([]);
  const [notif, setNotif] = useState<"unsupported" | "default" | "granted" | "denied">("default");
  const [alertDraft, setAlertDraft] = useState<{ symbol: string; condition: "ABOVE" | "BELOW"; price: string } | null>(null);
  const [migrate, setMigrate] = useState<MigrateResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Load from storage after mount and follow changes made elsewhere (e.g. the star on an instrument page).
  useEffect(() => {
    const load = () => { const s = wlStore.get(); setSymbols(s.length ? s : DEFAULTS); setAlerts(alertStore.get()); };
    const id = window.setTimeout(load, 0); window.addEventListener(WATCHLIST_EVENT, load); window.addEventListener("storage", load);
    const n = typeof Notification === "undefined" ? "unsupported" : Notification.permission; window.setTimeout(() => setNotif(n), 0);
    return () => { window.clearTimeout(id); window.removeEventListener(WATCHLIST_EVENT, load); window.removeEventListener("storage", load); };
  }, []);

  // Poll simulated quotes every 5 s for the symbols on the list; evaluate alerts in the browser.
  useEffect(() => {
    if (!symbols?.length) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { cache: "no-store" }); const d = await r.json();
        if (stop || !d.ok) return;
        const map: Record<string, Q> = {}; const t = Date.now(); for (const x of d.quotes as Q[]) map[x.symbol] = { ...x, stale: x.updated_at ? t - new Date(x.updated_at).getTime() > 5 * 60 * 1000 : true }; setQuotes(map);
        const now = alertStore.get(); const hit: LocalAlert[] = [];
        for (const a of now) { const px = map[a.symbol]?.ltp; if (!a.triggeredAt && px && ((a.condition === "ABOVE" && px >= a.price) || (a.condition === "BELOW" && px <= a.price))) { alertStore.markTriggered(a.id); hit.push({ ...a, triggeredAt: new Date().toISOString() }); } }
        if (hit.length) { setFired((f) => [...hit, ...f].slice(0, 10)); if (typeof Notification !== "undefined" && Notification.permission === "granted") for (const h of hit) new Notification(`AIRAVAT alert · ${h.symbol}`, { body: `${h.condition === "ABOVE" ? "Crossed above" : "Fell below"} ₹${fmt(h.price)} (simulated)`, icon: "/icons/icon-192.png" }); }
      } catch { /* offline: keep last quotes */ }
    };
    tick(); const id = window.setInterval(tick, 5000);
    return () => { stop = true; window.clearInterval(id); };
  }, [symbols]);

  const matches = useMemo(() => { const t = q.trim().toUpperCase(); if (!t) return []; return universe.filter((u) => u.symbol.includes(t) || u.name.toUpperCase().includes(t)).filter((u) => !symbols?.includes(u.symbol)).slice(0, 8); }, [q, universe, symbols]);
  const add = (s: string) => { const cur = wlStore.get(); wlStore.set([...(cur.length ? cur : symbols ?? []), s]); setQ(""); };
  const remove = (s: string) => { const cur = wlStore.get().length ? wlStore.get() : symbols ?? []; wlStore.set(cur.filter((x) => x !== s)); if (cur.length === 1) setSymbols([]); };
  const saveAlert = () => { if (!alertDraft) return; const p = Number(alertDraft.price); if (!(p > 0)) return; alertStore.add(alertDraft.symbol, alertDraft.condition, p); setAlertDraft(null); };
  const askNotif = async () => { if (typeof Notification === "undefined") return; const p = await Notification.requestPermission(); setNotif(p); };
  const doMigrate = async () => { setBusy(true); try { const r = await migrateWatchlist(symbols ?? [], alertStore.get().filter((a) => !a.triggeredAt).map((a) => ({ symbol: a.symbol, condition: a.condition, price: a.price }))); setMigrate(r); if (r.ok) wlStore.clear(); } finally { setBusy(false); } };

  if (symbols === null) return <div className="glass p-6 text-sm text-muted">Loading your browser watchlist…</div>;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
      <div className="space-y-4">
        {signedIn && (symbols.length > 0 || alerts.length > 0) && !migrate?.ok && (
          <div className={clsx("rounded-xl border p-4 text-sm", wantsMigrate ? "border-accent bg-accent/10" : "border-border bg-bg/30")}><div className="font-display font-semibold">Save this list to your account</div><p className="mt-1 text-muted">{symbols.length} symbol{symbols.length === 1 ? "" : "s"} and {alerts.filter((a) => !a.triggeredAt).length} active alert{alerts.filter((a) => !a.triggeredAt).length === 1 ? "" : "s"} move into your sandbox watchlist and server-side alerts; the browser copy is then cleared.</p><button type="button" onClick={doMigrate} disabled={busy} className="btn btn-primary btn-sm mt-2">{busy ? "Saving…" : "Save to my account"}</button>{migrate && !migrate.ok && <span className="ml-2 text-xs text-loss">{migrate.error}</span>}</div>
        )}
        {migrate?.ok && <div className="rounded-xl border border-profit/40 bg-profit/10 p-4 text-sm"><div className="font-display font-semibold text-profit">Saved</div><p className="mt-1 text-muted">{migrate.added} symbol{migrate.added === 1 ? "" : "s"} added and {migrate.alerts} alert{migrate.alerts === 1 ? "" : "s"} created{migrate.skipped?.length ? `; skipped ${migrate.skipped.join(", ")}` : ""}. <Link href="/app/markets" className="text-accent">Open the app watchlist →</Link></p></div>}
        <div className="glass p-4">
          <div className="relative"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a symbol or name (e.g. INFY, Bank)" className="input" aria-label="Add symbol" />{matches.length > 0 && <ul className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-border bg-surface p-1 shadow-lg">{matches.map((m) => <li key={m.symbol}><button type="button" onClick={() => add(m.symbol)} className="flex w-full justify-between rounded px-2 py-1 text-left text-sm hover:bg-bg"><span className="font-semibold">{m.symbol}</span><span className="text-muted">{m.name} · {m.segment}</span></button></li>)}</ul>}</div>
          <div className="mt-3 overflow-x-auto"><table className="table text-sm"><thead><tr><th>Symbol</th><th className="text-right">LTP</th><th className="text-right">Change</th><th className="text-right">Day range</th><th className="text-right">Volume</th><th></th></tr></thead>
            <tbody>{symbols.map((s) => { const x = quotes[s]; const ch = x ? x.ltp - x.prev_close : 0; const pct = x && x.prev_close ? (ch / x.prev_close) * 100 : 0; return (
              <tr key={s}>
                <td><Link href={`/markets/${encodeURIComponent(s)}`} className="font-semibold hover:text-accent">{s}</Link><div className="text-[11px] text-muted">{x?.name ?? ""}{x?.stale && <span className="ml-1 badge !text-[9px]">stale</span>}</div></td>
                <td className="tnum text-right">{x ? fmt(x.ltp) : "…"}</td>
                <td className={clsx("tnum text-right", ch >= 0 ? "text-profit" : "text-loss")}>{x ? `${ch >= 0 ? "+" : ""}${fmt(ch)} (${pct.toFixed(2)}%)` : ""}</td>
                <td className="tnum text-right text-xs text-muted">{x ? `${fmt(x.low)} – ${fmt(x.high)}` : ""}</td>
                <td className="tnum text-right text-xs text-muted">{x ? x.volume.toLocaleString("en-IN") : ""}</td>
                <td className="whitespace-nowrap text-right text-xs"><button type="button" onClick={() => setAlertDraft({ symbol: s, condition: "ABOVE", price: x ? x.ltp.toFixed(2) : "" })} className="text-accent hover:underline">Alert</button> · <button type="button" onClick={() => remove(s)} className="text-muted hover:text-loss">Remove</button></td>
              </tr>); })}</tbody></table>
            {symbols.length === 0 && <p className="p-3 text-sm text-muted">Your list is empty. Add a symbol above, or star one on any instrument page.</p>}
          </div>
          {alertDraft && <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm"><span className="font-semibold">{alertDraft.symbol}</span><select className="select !w-auto" value={alertDraft.condition} onChange={(e) => setAlertDraft({ ...alertDraft, condition: e.target.value as "ABOVE" | "BELOW" })}><option value="ABOVE">crosses above</option><option value="BELOW">falls below</option></select><input className="input !w-32" type="number" step="0.05" value={alertDraft.price} onChange={(e) => setAlertDraft({ ...alertDraft, price: e.target.value })} aria-label="Alert price" /><button type="button" onClick={saveAlert} className="btn btn-primary btn-sm">Set alert</button><button type="button" onClick={() => setAlertDraft(null)} className="btn btn-ghost btn-sm">Cancel</button></div>}
          <p className="mt-2 text-[11px] text-muted">Simulated quotes, refreshed every 5 seconds while this page is open. Stored only in this browser until you save it to an account.</p>
        </div>
      </div>
      <aside className="space-y-4">
        {fired.length > 0 && <div className="rounded-xl border border-warn/50 bg-warn/10 p-4 text-sm"><div className="font-display font-semibold text-warn">Alerts triggered</div><ul className="mt-1 space-y-1">{fired.map((f) => <li key={f.id + f.triggeredAt}><b>{f.symbol}</b> {f.condition === "ABOVE" ? "crossed above" : "fell below"} ₹{fmt(f.price)}</li>)}</ul></div>}
        <div className="glass p-4">
          <div className="flex items-center justify-between"><div className="font-display font-semibold">Alerts</div><span className="text-xs text-muted">{alerts.filter((a) => !a.triggeredAt).length} active</span></div>
          {alerts.length === 0 ? <p className="mt-1 text-sm text-muted">No alerts yet. Use &quot;Alert&quot; on any row. They are checked only while this page is open; account alerts are checked on the server.</p> : <ul className="mt-2 space-y-1 text-sm">{alerts.map((a) => <li key={a.id} className="flex items-center justify-between gap-2"><span className={clsx(a.triggeredAt && "text-muted line-through")}>{a.symbol} {a.condition === "ABOVE" ? "≥" : "≤"} ₹{fmt(a.price)}</span><span className="flex items-center gap-2 text-xs">{a.triggeredAt && <span className="badge !text-[9px]">triggered</span>}<button type="button" onClick={() => alertStore.remove(a.id)} className="text-muted hover:text-loss">×</button></span></li>)}</ul>}
          {notif === "default" && <button type="button" onClick={askNotif} className="btn btn-ghost btn-sm mt-3 w-full">Enable browser notifications</button>}
          {notif === "granted" && <p className="mt-2 text-xs text-profit">Browser notifications on for this site.</p>}
          {notif === "denied" && <p className="mt-2 text-xs text-muted">Notifications are blocked in the browser settings.</p>}
        </div>
        <div className="glass p-4 text-sm"><div className="font-display font-semibold">Keep it after you sign up</div><p className="mt-1 text-muted">{signedIn ? "You are signed in: use the save box to move this list into your account." : "Open a sandbox account or sign in, come back here, and the list and alerts move into your account with one click; server-side alerts then run even when the page is closed."}</p>{!signedIn && <div className="mt-2 flex gap-2"><Link href="/login?next=/markets/watchlist?migrate=1" className="btn btn-primary btn-sm">Sign in</Link><Link href="/open-account" className="btn btn-ghost btn-sm">Open account</Link></div>}</div>
        <div className="glass p-4 text-xs text-muted"><div className="font-display text-sm font-semibold text-text">Shortcuts</div><ul className="mt-1 list-disc space-y-1 pl-4"><li><Link href="/markets/heatmap" className="text-accent">Heatmap</Link> and <Link href="/markets/option-chain" className="text-accent">option chain</Link> for the same symbols</li><li><Link href="/api/watchlist/export" className="text-accent">Export the universe as CSV</Link></li><li>Clear everything: <button type="button" onClick={() => { wlStore.clear(); setSymbols([]); setAlerts([]); }} className="text-loss hover:underline">reset this browser&apos;s list</button></li></ul></div>
      </aside>
    </div>
  );
}
