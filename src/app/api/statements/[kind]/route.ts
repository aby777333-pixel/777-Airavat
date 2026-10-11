import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Statement exports for the signed-in client: every row comes from the posted ledger / trade book through RLS.
const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = (header: string[], rows: unknown[][]) => [header.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
function fyBounds(fy: string | null) { const y = /^\d{4}-\d{2}$/.test(fy ?? "") ? Number(fy!.slice(0, 4)) : (new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1); return { from: `${y}-04-01`, to: `${y + 1}-03-31`, label: `${y}-${String(y + 1).slice(2)}` }; }

export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { data: account } = await supabase.from("trading_accounts").select("id,client_code").eq("user_id", user.id).eq("environment", "sandbox").maybeSingle();
  if (!account) return NextResponse.json({ error: "NO_ACCOUNT" }, { status: 404 });
  const { from, to, label } = fyBounds(req.nextUrl.searchParams.get("fy"));
  let body = ""; let name = `airavat-${kind}-${label}.csv`;
  if (kind === "ledger") {
    const { data: la } = await supabase.from("ledger_accounts").select("id").eq("trading_account_id", account.id).maybeSingle();
    const { data } = la ? await supabase.from("journal_lines").select("id,debit,credit, entry:journal_entries!inner(id,narration,posted_at,ref_type,ref_id)").eq("ledger_account_id", la.id).gte("entry.posted_at", from).lte("entry.posted_at", `${to}T23:59:59+05:30`).order("id") : { data: [] };
    let bal = 0;
    body = csv(["entry_id", "posted_at", "ref_type", "ref_id", "narration", "debit", "credit", "running_balance", "environment"], (data ?? []).map((l) => { const e = l.entry as unknown as { id: number; narration: string; posted_at: string; ref_type: string; ref_id: string }; bal += Number(l.credit) - Number(l.debit); return [e.id, e.posted_at, e.ref_type, e.ref_id, e.narration, l.debit, l.credit, bal.toFixed(2), "sandbox"]; }));
  } else if (kind === "trades") {
    const { data } = await supabase.from("trades").select("traded_at,order_id,exchange_trade_id,side,product,qty,price,value,brokerage,stt,exchange_txn,sebi_fee,stamp_duty,gst,total_charges, instrument:instruments(symbol,exchange)").eq("account_id", account.id).gte("traded_at", from).lte("traded_at", `${to}T23:59:59+05:30`).order("traded_at");
    body = csv(["traded_at", "order_id", "trade_id", "symbol", "exchange", "side", "product", "qty", "price", "value", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "total_charges", "environment"], (data ?? []).map((t) => { const i = t.instrument as unknown as { symbol: string; exchange: string }; return [t.traded_at, t.order_id, t.exchange_trade_id, i.symbol, i.exchange, t.side, t.product, t.qty, t.price, t.value, t.brokerage, t.stt, t.exchange_txn, t.sebi_fee, t.stamp_duty, t.gst, t.total_charges, "sandbox"]; }));
    name = `airavat-tradebook-${label}.csv`;
  } else if (kind === "holdings") {
    const { data } = await supabase.from("holdings").select("qty,avg_price,updated_at, instrument:instruments(symbol,isin,exchange, quote:quotes(ltp))").eq("account_id", account.id).gt("qty", 0);
    body = csv(["symbol", "isin", "exchange", "qty", "avg_price", "ltp_simulated", "value", "pnl", "as_of"], (data ?? []).map((h) => { const i = h.instrument as unknown as { symbol: string; isin: string | null; exchange: string; quote: { ltp: number } | { ltp: number }[] | null }; const q = Array.isArray(i.quote) ? i.quote[0] : i.quote; const ltp = Number(q?.ltp ?? 0); return [i.symbol, i.isin ?? "", i.exchange, h.qty, h.avg_price, ltp, (ltp * Number(h.qty)).toFixed(2), ((ltp - Number(h.avg_price)) * Number(h.qty)).toFixed(2), new Date().toISOString()]; }));
    name = "airavat-holdings.csv";
  } else if (kind === "capital-gains") {
    const { data } = await supabase.rpc("capital_gains", { p_account: account.id, p_from: from, p_to: to });
    const g = data as { rows: Record<string, unknown>[]; stcg: number; ltcg: number; speculative_intraday: number } | null;
    body = csv(["symbol", "qty", "buy_date", "buy_price", "sell_date", "sell_price", "holding_days", "class", "gain"], (g?.rows ?? []).map((r) => [r.symbol, r.qty, r.buy_date, r.buy_price, r.sell_date, r.sell_price, r.holding_days, r.class, r.gain])) + `\n\n"STCG total",${g?.stcg ?? 0}\n"LTCG total",${g?.ltcg ?? 0}\n"Intraday (speculative)",${g?.speculative_intraday ?? 0}\n"Note","Simulated; not a tax document"`;
  } else if (kind === "pnl") {
    const { data } = await supabase.from("positions").select("trading_day,product,realized_pnl,buy_qty,sell_qty,buy_value,sell_value, instrument:instruments(symbol)").eq("account_id", account.id).gte("trading_day", from).lte("trading_day", to).order("trading_day");
    body = csv(["trading_day", "symbol", "product", "buy_qty", "buy_value", "sell_qty", "sell_value", "realized_pnl"], (data ?? []).map((p) => [p.trading_day, (p.instrument as unknown as { symbol: string }).symbol, p.product, p.buy_qty, p.buy_value, p.sell_qty, p.sell_value, p.realized_pnl]));
  } else if (kind === "contract-note") {
    const day = req.nextUrl.searchParams.get("day");
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "DAY_REQUIRED" }, { status: 400 });
    const { data, error } = await supabase.rpc("contract_note", { p_account: account.id, p_day: day });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const n = data as { note_no: string; trades: Record<string, unknown>[]; totals: Record<string, string>; disclaimer: string };
    body = `"Contract note",${esc(n.note_no)}\n"Client",${esc(account.client_code)}\n"Day",${esc(day)}\n\n` + csv(["time", "order_id", "trade_id", "symbol", "side", "product", "qty", "price", "value", "brokerage", "stt", "exchange_txn", "sebi_fee", "stamp_duty", "gst", "total_charges"], n.trades.map((t) => [t.time, t.order_id, t.exchange_trade_id, t.symbol, t.side, t.product, t.qty, t.price, t.value, t.brokerage, t.stt, t.exchange_txn, t.sebi_fee, t.stamp_duty, t.gst, t.total_charges])) + "\n\n" + Object.entries(n.totals).map(([k, v]) => `${esc(k)},${v}`).join("\n") + `\n${esc(n.disclaimer)}`;
    name = `airavat-${n.note_no}.csv`;
  } else return NextResponse.json({ error: "UNKNOWN_STATEMENT" }, { status: 404 });
  return new NextResponse(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
}
