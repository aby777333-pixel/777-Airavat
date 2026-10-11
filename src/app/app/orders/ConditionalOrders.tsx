import Link from "next/link";
import { istTime, price } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { cancelConditional } from "./conditional-actions";

type Row = { id: number; kind: string; status: string; side: string | null; product: string | null; order_type: string; qty: number | null; price: number | null; trigger_price: number | null; trigger_direction: string | null; target_price: number | null; stop_price: number | null; trail_pct: number | null; trail_amount: number | null; high_water: number | null; low_water: number | null; disclosed_qty: number | null; filled_total: number; legs: { symbol: string; side: string; qty: number; result?: { status?: string; reason?: string } }[] | null; parent_id: number | null; entry_order_id: string | null; child_order_ids: string[]; valid_till: string | null; last_error: string | null; triggered_at: string | null; created_at: string; note: string | null; instrument: { symbol: string } | { symbol: string }[] | null };
const tone = (s: string) => (["COMPLETED", "TRIGGERED"].includes(s) ? "ok" : ["ACTIVE", "PENDING"].includes(s) ? "info" : ["FAILED"].includes(s) ? "bad" : "default");

function describe(r: Row) {
  switch (r.kind) {
    case "GTT": return `${r.order_type}${r.price ? ` @ ${price(r.price)}` : ""} when LTP ${r.trigger_direction === "ABOVE" ? "≥" : "≤"} ${price(r.trigger_price)}`;
    case "AMO": return `${r.order_type}${r.price ? ` @ ${price(r.price)}` : ""} at next open`;
    case "OCO": return `target ${price(r.target_price)} / stop ${price(r.stop_price)}`;
    case "TRAILING_STOP": return `trail ${r.trail_pct ? `${r.trail_pct}%` : price(r.trail_amount)} · water ${price(r.side === "SELL" ? r.high_water : r.low_water)}`;
    case "BRACKET": return `entry ${r.order_type}${r.price ? ` @ ${price(r.price)}` : ""} → target ${price(r.target_price)} / stop ${price(r.stop_price)}`;
    case "COVER": return `entry ${r.order_type}${r.price ? ` @ ${price(r.price)}` : ""} → stop ${price(r.stop_price)}`;
    case "ICEBERG": return `${r.filled_total}/${r.qty} filled in slices of ${r.disclosed_qty}`;
    case "BASKET": return `${r.legs?.length ?? 0} legs: ${(r.legs ?? []).map((l) => `${l.side} ${l.qty} ${l.symbol} → ${l.result?.status ?? "?"}`).join("; ")}`;
    default: return "";
  }
}

export default function ConditionalOrders({ rows }: { rows: Row[] }) {
  const open = rows.filter((r) => ["PENDING", "ACTIVE", "TRIGGERED"].includes(r.status));
  return (
    <Card title={`Conditional orders (${open.length} working · ${rows.length} total)`} subtitle="Broker-managed: GTT, after-market, OCO, trailing stop, bracket, cover, iceberg and basket. Evaluated every minute; each trigger places a normal order through the risk engine." className="mt-6">
      {rows.length === 0 ? <p className="text-sm text-muted">None yet. Use “Advanced orders” on any instrument page or the basket builder.</p> : (
        <div className="overflow-x-auto"><table className="table text-sm"><thead><tr><th>Placed</th><th>Kind</th><th>Symbol</th><th>Side / qty</th><th>Rule</th><th>Status</th><th>Orders</th><th>Valid till</th><th></th></tr></thead>
          <tbody>{rows.map((r) => { const sym = (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument)?.symbol; return (
            <tr key={r.id}>
              <td className="text-xs text-muted">{istTime(r.created_at)}</td>
              <td><Badge tone="accent">{r.kind.replace("_", " ")}</Badge>{r.parent_id && <div className="text-[11px] text-faint">child of #{r.parent_id}</div>}</td>
              <td className="font-semibold">{sym ?? (r.kind === "BASKET" ? "basket" : "")}</td>
              <td className={r.side === "BUY" ? "text-buy" : r.side === "SELL" ? "text-sell" : ""}>{r.side} {r.qty} {r.product}</td>
              <td className="max-w-md text-xs text-muted">{describe(r)}{r.last_error && <div className="text-loss">{r.last_error}</div>}</td>
              <td><Badge tone={tone(r.status)}>{r.status}</Badge>{r.triggered_at && <div className="text-[11px] text-faint">fired {istTime(r.triggered_at, false)}</div>}</td>
              <td className="text-xs">{r.entry_order_id && <Link className="text-accent" href={`/app/orders/${r.entry_order_id}`}>entry</Link>}{r.child_order_ids.map((id, i) => <Link key={id} className="ml-1 text-accent" href={`/app/orders/${id}`}>#{i + 1}</Link>)}</td>
              <td className="text-xs text-muted">{r.valid_till ? istTime(r.valid_till) : "—"}</td>
              <td className="text-right">{["PENDING", "ACTIVE", "TRIGGERED"].includes(r.status) && <ActionForm action={cancelConditional}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost btn-sm">Cancel</button></ActionForm>}</td>
            </tr>); })}</tbody></table></div>
      )}
      <Link href="/app/orders/basket" className="btn btn-ghost btn-sm mt-3">Basket builder →</Link>
    </Card>
  );
}
