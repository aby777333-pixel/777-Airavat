import Link from "next/link";
import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { istTime, price } from "@/lib/format";
import { Badge, PageHeader, statusTone } from "@/components/ui";
import { cancelAnyOrder } from "../actions";
import ActionForm from "@/components/ActionForm";

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const { supabase } = await requireStaff("/admin/orders");
  let q = supabase.from("orders").select("*, instrument:instruments(symbol), account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  const { data: orders } = await q;
  const statuses = ["", "ACKNOWLEDGED", "PARTIALLY_FILLED", "FILLED", "RMS_REJECTED", "CANCELLED", "EXPIRED"];
  return (
    <>
      <PageHeader eyebrow="OMS" title="Order monitor" subtitle="All client orders with state and RMS outcome. Staff cancellations are audited." />
      <div className="mb-4 flex flex-wrap gap-2">{statuses.map((s) => <Link key={s} href={s ? `/admin/orders?status=${s}` : "/admin/orders"} className={clsx("btn btn-sm", (status ?? "") === s ? "btn-primary" : "btn-ghost")}>{s || "All"}</Link>)}</div>
      <div className="glass overflow-x-auto p-2">
        <table className="table text-sm">
          <thead><tr><th>Time</th><th>Client</th><th>Symbol</th><th>Side</th><th>Type</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Filled</th><th>Status</th><th>Exchange id</th><th></th></tr></thead>
          <tbody>{(orders ?? []).map((o) => (
            <tr key={o.id}><td className="text-xs text-muted">{istTime(o.created_at)}</td><td className="tnum">{(o.account as unknown as { client_code: string })?.client_code}</td><td><Link href={`/app/orders/${o.id}`} className="font-semibold hover:text-accent">{(o.instrument as unknown as { symbol: string })?.symbol}</Link></td>
              <td className={clsx("font-semibold", o.side === "BUY" ? "text-buy" : "text-sell")}>{o.side}</td><td className="text-muted">{o.order_type}/{o.product}</td><td className="num">{o.qty}</td><td className="num">{o.price ? price(o.price) : "MKT"}</td><td className="num">{o.filled_qty}{o.avg_fill_price ? ` @ ${price(o.avg_fill_price)}` : ""}</td>
              <td><Badge tone={statusTone(o.status)}>{o.status}</Badge>{o.rejection_reason && <div className="text-xs text-loss">{o.rejection_reason}</div>}</td><td className="text-xs text-faint">{o.exchange_order_id ?? "—"}</td>
              <td>{["ACKNOWLEDGED", "PARTIALLY_FILLED"].includes(o.status) && <ActionForm action={cancelAnyOrder}><input type="hidden" name="order_id" value={o.id} /><button className="btn btn-ghost btn-sm">Cancel</button></ActionForm>}</td></tr>))}</tbody>
        </table>
      </div>
    </>
  );
}
