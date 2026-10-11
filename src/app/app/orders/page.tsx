import Link from "next/link";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { istTime, price } from "@/lib/format";
import { Badge, Empty, PageHeader, statusTone } from "@/components/ui";
import { cancelOrder } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function Orders() {
  const { supabase, user } = await requireUser("/app/orders");
  const { data: orders } = await supabase.from("orders").select("*, instrument:instruments(symbol)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
  const open = (orders ?? []).filter((o) => ["ACKNOWLEDGED", "PARTIALLY_FILLED"].includes(o.status));
  return (
    <>
      <PageHeader eyebrow="Orders" title="Order book" subtitle={`${open.length} open · ${(orders ?? []).length} total`} />
      {(orders ?? []).length === 0 ? <Empty title="No orders yet" cta={{ href: "/app/markets", label: "Go to market watch" }} /> : (
        <div className="glass overflow-x-auto p-2">
          <table className="table">
            <thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Filled</th><th className="num">Avg</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="text-xs text-muted">{istTime(o.created_at)}</td>
                  <td><Link href={`/app/orders/${o.id}`} className="font-semibold hover:text-accent">{(o.instrument as unknown as { symbol: string })?.symbol}</Link></td>
                  <td className={clsx("font-semibold", o.side === "BUY" ? "text-buy" : "text-sell")}>{o.side}</td>
                  <td className="text-muted">{o.order_type} / {o.product}</td>
                  <td className="num">{o.qty}</td>
                  <td className="num">{o.price ? price(o.price) : "MKT"}{o.trigger_price ? <span className="text-xs text-faint"> trig {price(o.trigger_price)}</span> : null}</td>
                  <td className="num">{o.filled_qty}</td>
                  <td className="num">{o.avg_fill_price ? price(o.avg_fill_price) : "—"}</td>
                  <td><Badge tone={statusTone(o.status)}>{o.status}</Badge>{o.rejection_reason && <div className="text-xs text-loss">{o.rejection_reason}</div>}</td>
                  <td className="text-right">{["ACKNOWLEDGED", "PARTIALLY_FILLED"].includes(o.status) && (
                    <ActionForm action={cancelOrder}><input type="hidden" name="order_id" value={o.id} /><button className="btn btn-ghost btn-sm">Cancel</button></ActionForm>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
