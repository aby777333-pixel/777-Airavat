import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { money, price } from "@/lib/format";
import { Notice, PageHeader } from "@/components/ui";
import { rpcError } from "@/lib/account";

type Opt = { option: string; qty: number; exit_price: number; estimated_charges: number; realized_pnl: number; remaining_qty: number; remaining_exposure: number; exposure_pct_after: number | null; one_pct_move_impact_after: number };
type Twin = { symbol: string; product: string; net_qty: number; avg_price: number; ltp: number; options: Opt[]; disclaimer: string };

export default async function DecisionTwin({ searchParams }: { searchParams: Promise<{ symbol?: string; product?: string }> }) {
  const { symbol = "", product = "CNC" } = await searchParams;
  const { supabase } = await requireUser("/app/positions");
  const { data, error } = await supabase.rpc("decision_twin", { p_symbol: symbol.toUpperCase(), p_product: product });
  const t = data as Twin | null;
  return (
    <>
      <PageHeader eyebrow="Sentinel X · Decision Twin" title={`${symbol.toUpperCase()} · ${product}`} subtitle="Hold, reduce half or close: hypothetical outcomes at the current simulated quote with sandbox charges. Nothing is executed from this screen." action={<Link href="/app/positions" className="btn btn-ghost btn-sm">← Positions</Link>} />
      {error && <Notice tone="bad">{rpcError(error)}</Notice>}
      {t && (
        <>
          <div className="mb-4 text-sm text-muted">Net qty <strong className="text-text">{t.net_qty}</strong> · average {price(t.avg_price)} · LTP {price(t.ltp)}</div>
          <div className="grid gap-4 md:grid-cols-3">
            {t.options.map((o) => (
              <div key={o.option} className={clsx("p-5", o.option === "hold" ? "glass" : "m-crystal")}>
                <div className="font-display text-lg font-semibold capitalize">{o.option.replace("_", " ")}</div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><dt className="text-muted">Quantity</dt><dd className="tnum">{o.qty}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Exit price (bid/ask)</dt><dd className="tnum">{o.qty ? price(o.exit_price) : "—"}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Estimated charges</dt><dd className="tnum">{money(o.estimated_charges)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Realised P&L after charges</dt><dd className={clsx("tnum font-semibold", o.realized_pnl >= 0 ? "text-profit" : "text-loss")}>{money(o.realized_pnl)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Remaining exposure</dt><dd className="tnum">{money(o.remaining_exposure)}{o.exposure_pct_after !== null && <span className="text-muted"> ({o.exposure_pct_after}%)</span>}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">1% move impact after</dt><dd className="tnum">{money(o.one_pct_move_impact_after)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-faint">{t.disclaimer}</p>
          <Link href={`/app/markets/${encodeURIComponent(t.symbol)}?side=${t.net_qty > 0 ? "SELL" : "BUY"}`} className="btn btn-primary mt-4">Open order ticket</Link>
        </>
      )}
    </>
  );
}
