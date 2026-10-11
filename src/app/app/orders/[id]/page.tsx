import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { istTime, money, price } from "@/lib/format";
import { Badge, Card, PageHeader, statusTone } from "@/components/ui";

export default async function OrderPassport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/app/orders/${id}`);
  const { data: o } = await supabase.from("orders").select("*, instrument:instruments(symbol,name)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const [{ data: events }, { data: trades }] = await Promise.all([
    supabase.from("order_events").select("*").eq("order_id", id).order("id"),
    supabase.from("trades").select("*").eq("order_id", id).order("traded_at"),
  ]);
  const entryIds = (trades ?? []).map((t) => t.journal_entry_id).filter(Boolean);
  const { data: lines } = entryIds.length ? await supabase.from("journal_lines").select("*, entry:journal_entries(id,narration,posted_at), account:ledger_accounts(code,name,type)").in("entry_id", entryIds).order("id") : { data: [] };
  const inst = o.instrument as unknown as { symbol: string; name: string };
  const rms = (o.rms_result ?? []) as { check: string; ok: boolean; [k: string]: unknown }[];

  return (
    <>
      <PageHeader eyebrow="ClearView · order passport" title={<><span className={clsx(o.side === "BUY" ? "text-buy" : "text-sell")}>{o.side}</span> {o.qty} {inst.symbol}</>} subtitle={<>{o.order_type} · {o.product} · placed {istTime(o.created_at)} · <Badge tone={statusTone(o.status)}>{o.status}</Badge> · <Badge tone="sim">Simulated</Badge></>} action={<Link href="/app/orders" className="btn btn-ghost btn-sm">← Orders</Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <div className="space-y-5">
          <Card title="Lifecycle events" subtitle="Durable order journal">
            <ol className="space-y-3 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div><div><Badge tone={statusTone(e.to_status)}>{e.to_status}</Badge> <span className="text-xs text-faint">{istTime(e.created_at)}</span></div>
                    {e.payload && <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap text-xs text-muted">{JSON.stringify(e.payload)}</pre>}</div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Risk checks" subtitle="Fail-closed pre-trade validation">
            {rms.length === 0 ? <p className="text-sm text-muted">No RMS record.</p> : (
              <ul className="space-y-2 text-sm">{rms.map((r, i) => (
                <li key={i} className="flex items-start gap-2"><Badge tone={r.ok ? "ok" : "bad"}>{r.ok ? "pass" : "fail"}</Badge><div><div className="font-medium">{r.check}</div><div className="text-xs text-muted">{Object.entries(r).filter(([k]) => !["check", "ok"].includes(k)).map(([k, v]) => `${k}: ${v}`).join(" · ")}</div></div></li>))}</ul>
            )}
            {o.exchange_order_id && <p className="mt-3 text-xs text-faint">Simulated exchange order id: {o.exchange_order_id}</p>}
          </Card>
        </div>
        <div className="space-y-5">
          <Card title="Executions" subtitle="Trades with charge breakdown">
            {(trades ?? []).length === 0 ? <p className="text-sm text-muted">No fills yet.</p> : (
              <table className="table text-sm">
                <thead><tr><th>Trade</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Value</th><th className="num">Brokerage</th><th className="num">STT</th><th className="num">Exch</th><th className="num">SEBI</th><th className="num">Stamp</th><th className="num">GST</th><th className="num">Total</th></tr></thead>
                <tbody>{(trades ?? []).map((t) => (
                  <tr key={t.id}><td className="text-xs text-muted">{t.exchange_trade_id}<br />{istTime(t.traded_at)}</td><td className="num">{t.qty}</td><td className="num">{price(t.price)}</td><td className="num">{money(t.value)}</td><td className="num">{money(t.brokerage)}</td><td className="num">{money(t.stt)}</td><td className="num">{money(t.exchange_txn)}</td><td className="num">{money(t.sebi_fee)}</td><td className="num">{money(t.stamp_duty)}</td><td className="num">{money(t.gst)}</td><td className="num font-semibold">{money(t.total_charges)}</td></tr>))}</tbody>
              </table>
            )}
          </Card>
          <Card title="Ledger entries" subtitle="Double-entry journal lines posted for this order">
            {(lines ?? []).length === 0 ? <p className="text-sm text-muted">No ledger lines (order not executed).</p> : (
              <table className="table text-sm">
                <thead><tr><th>Entry</th><th>Account</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
                <tbody>{(lines ?? []).map((l) => { const acc = l.account as unknown as { code: string; name: string }; const en = l.entry as unknown as { id: number; narration: string }; return (
                  <tr key={l.id}><td className="text-xs text-muted">#{en.id}<br />{en.narration}</td><td>{acc.code} <span className="text-xs text-muted">{acc.name}</span></td><td className="num">{Number(l.debit) ? money(l.debit) : ""}</td><td className="num">{Number(l.credit) ? money(l.credit) : ""}</td></tr>); })}</tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
