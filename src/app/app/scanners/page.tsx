import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { deleteScanner } from "../intel/actions";
import ScannerBuilder from "./ScannerBuilder";

export default async function Scanners() {
  const { supabase, user } = await requireUser("/app/scanners");
  const [{ data: scanners }, { data: results }] = await Promise.all([
    supabase.from("scanners").select("*").or(`kind.eq.system,owner_id.eq.${user.id}`).order("kind").order("id"),
    supabase.from("scanner_results").select("scanner_id, matched_at, evidence, instrument:instruments(symbol,segment)").order("matched_at", { ascending: false }).limit(300),
  ]);
  const byScanner = new Map<number, typeof results>();
  for (const r of results ?? []) { const arr = byScanner.get(r.scanner_id) ?? []; arr.push(r); byScanner.set(r.scanner_id, arr); }
  const system = (scanners ?? []).filter((s) => s.kind === "system");
  const mine = (scanners ?? []).filter((s) => s.kind === "user");
  return (
    <>
      <PageHeader eyebrow="Scanner Matrix" title="Pulse wall" subtitle="System scanners run every five minutes over derived metrics (returns, RSI, ATR, volume ratio, 20-day and 52-week levels). Each match records the exact values that triggered it." />
      <Notice tone="warn">Matches are observations, not recommendations, and have no verified predictive value. Metrics derive from simulated sandbox prices.</Notice>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[...system, ...mine].map((s) => {
          const rows = (byScanner.get(s.id) ?? []).slice(0, 8);
          return (
            <div key={s.id} className={rows.length ? "m-crystal p-4" : "glass p-4"}>
              <div className="flex items-start justify-between gap-2"><div><div className="font-display font-semibold">{s.name}</div><div className="text-xs text-muted">{s.description}</div></div><Badge tone={s.kind === "user" ? "accent" : "default"}>{s.kind === "user" ? "mine" : s.category}</Badge></div>
              <div className="mt-2 text-[11px] text-faint">{(s.conditions as { metric: string; op: string; value?: number; metric2?: string }[]).map((c) => `${c.metric} ${c.op} ${c.metric2 ?? c.value}`).join(` ${s.logic} `)}</div>
              <ul className="mt-3 space-y-1 text-sm">
                {rows.length === 0 ? <li className="text-muted">No matches in the latest runs.</li> : rows.map((r, i) => { const ins = (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string; segment: string } | null; return <li key={i} className="flex items-center justify-between"><Link href={`/app/markets/${encodeURIComponent(ins?.symbol ?? "")}`} className="font-medium hover:text-accent">{ins?.symbol}</Link><span className="text-xs text-faint">{istTime(r.matched_at, false)}</span></li>; })}
              </ul>
              {s.kind === "user" && <ActionForm action={deleteScanner} className="mt-3"><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm">Delete</button></ActionForm>}
            </div>
          );
        })}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Build a scanner" subtitle={`No-code conditions over whitelisted metrics. ${mine.length}/20 saved.`}><ScannerBuilder /></Card>
        <Card title="Metric glossary">
          <ul className="grid gap-1 text-xs text-muted sm:grid-cols-2">
            {[["ret_1d/5d/20d", "Return over 1, 5, 20 sessions (%)"], ["high_20d/low_20d", "20-session high/low"], ["high_52w/low_52w", "252-session high/low"], ["sma_20/sma_50", "Simple moving averages"], ["rsi_14", "Relative strength index"], ["atr_pct_14", "Average true range as % of price"], ["avg_vol_20", "20-session average volume"], ["vol_ratio", "Today's volume / 20-day average"], ["dist_52w_high_pct", "Distance below 52-week high (%)"], ["rs_vs_nifty_20", "20-day return minus NIFTY 50 return"], ["gap_pct", "Open vs previous close (%)"]].map(([k, v]) => <li key={k}><code className="text-text">{k}</code> — {v}</li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}
