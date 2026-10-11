import { requireStaff } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Notice, PageHeader, Stat } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { callShortfall, decideException, raiseException, resolveShortfall, runSettlementCycle } from "./actions";

const tone = (s: string) => (s === "settled" || s === "resolved" || s === "approved" ? "ok" : s === "short" || s === "rejected" ? "bad" : s === "called" ? "info" : "default");

export default async function BackOffice() {
  const { supabase, profile } = await requireStaff("/admin/backoffice");
  const [{ data: obligations }, { data: shortfalls }, { data: exceptions }, { data: accounts }] = await Promise.all([
    supabase.from("settlement_obligations").select("*, account:trading_accounts(client_code)").order("trading_day", { ascending: false }).limit(60),
    supabase.from("margin_shortfalls").select("*, account:trading_accounts(client_code)").order("created_at", { ascending: false }).limit(40),
    supabase.from("backoffice_exceptions").select("*, account:trading_accounts(client_code), raiser:profiles!backoffice_exceptions_raised_by_fkey(full_name,email)").order("created_at", { ascending: false }).limit(60),
    supabase.from("trading_accounts").select("id, client_code").eq("environment", "sandbox").order("client_code"),
  ]);
  const role = profile?.role ?? "";
  const canSettle = ["ops", "finance", "risk", "admin", "super_admin"].includes(role);
  const canDecide = ["ops", "finance", "admin", "super_admin"].includes(role);
  const pending = (obligations ?? []).filter((o) => o.status === "pending");
  const openShort = (shortfalls ?? []).filter((s) => s.status !== "resolved");
  const openExc = (exceptions ?? []).filter((e) => e.status === "open");
  const cc = (x: unknown) => (x as { client_code?: string } | null)?.client_code ?? "—";
  return (
    <>
      <PageHeader eyebrow="Back office" title="Settlement obligations, margin shortfalls and exceptions" subtitle="T+1 obligations are generated from the trade book, settled by the 18:30 IST cycle, and any negative ledger becomes a shortfall. Refunds and reversals follow maker-checker and post to the ledger." action={canSettle ? <ActionForm action={runSettlementCycle} successText="Cycle complete."><button className="btn btn-primary btn-sm">Run settlement cycle now</button></ActionForm> : undefined} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Pending obligations" value={pending.length} sub={`net ${money(pending.reduce((s, o) => s + Number(o.net), 0))}`} />
        <Stat label="Open shortfalls" value={openShort.length} tone={openShort.length ? "loss" : "default"} sub={money(openShort.reduce((s, x) => s + Number(x.amount), 0))} />
        <Stat label="Open exceptions" value={openExc.length} />
        <Stat label="Last cycle" value={(obligations ?? []).find((o) => o.settled_at)?.settled_at ? istTime((obligations ?? []).find((o) => o.settled_at)!.settled_at, true) : "—"} />
      </div>
      <Notice tone="info">Sandbox clearing: funds and securities already move at fill time, so settlement here records obligations and verifies the ledger; there is no clearing corporation, auction or short-delivery process.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Settlement obligations (T+1)" subtitle="Per account per trading day">
          <div className="overflow-x-auto"><table className="table text-xs"><thead><tr><th>Client</th><th>Trade day</th><th>Settle</th><th className="num">Pay-in</th><th className="num">Pay-out</th><th className="num">Net</th><th>Securities</th><th>Status</th></tr></thead>
            <tbody>{(obligations ?? []).map((o) => <tr key={o.id}><td className="font-mono">{cc(o.account)}</td><td>{o.trading_day}</td><td>{o.settlement_day}</td><td className="num">{money(o.pay_in)}</td><td className="num">{money(o.pay_out)}</td><td className={`num ${Number(o.net) >= 0 ? "text-profit" : "text-loss"}`}>{money(o.net)}</td><td>{((o.securities as { symbol: string; qty_in: number; qty_out: number }[]) ?? []).map((s) => `${s.symbol} +${s.qty_in}/−${s.qty_out}`).join(", ")}</td><td><Badge tone={tone(o.status)}>{o.status}</Badge></td></tr>)}{(obligations ?? []).length === 0 && <tr><td colSpan={8} className="text-muted">No obligations yet. Run the cycle after trades.</td></tr>}</tbody></table></div>
        </Card>
        <Card title="Margin shortfalls" subtitle="Detected hourly during market hours and on settlement">
          {(shortfalls ?? []).length === 0 ? <p className="text-sm text-muted">No shortfalls recorded.</p> : (shortfalls ?? []).map((s) => (
            <div key={s.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2"><span><span className="font-mono">{cc(s.account)}</span> · {s.day} · <span className="tnum font-semibold">{money(s.amount)}</span> <Badge tone={tone(s.status)}>{s.status}</Badge></span>
                {s.status !== "resolved" && canSettle && <span className="flex gap-1">{s.status === "open" && <ActionForm action={callShortfall}><input type="hidden" name="id" value={s.id} /><input name="note" className="input !py-1 !text-xs" placeholder="Margin call note" /><button className="btn btn-ghost btn-sm">Call</button></ActionForm>}<ActionForm action={resolveShortfall}><input type="hidden" name="id" value={s.id} /><button className="btn btn-ghost btn-sm">Resolve</button></ActionForm></span>}</div>
              <div className="text-xs text-faint">{s.note}</div>
            </div>))}
        </Card>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="Raise an exception" subtitle="Refund, charge dispute, reversal, reconciliation or other">
          <ActionForm action={raiseException} successText="Raised for a second person to decide." className="grid gap-2 text-sm">
            <label>Kind<select name="kind" className="select mt-1 w-full">{["refund", "charge_dispute", "reversal", "reconciliation", "other"].map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select></label>
            <label>Account<select name="account_id" className="select mt-1 w-full"><option value="">— none —</option>{(accounts ?? []).map((a) => <option key={a.id} value={a.id}>{a.client_code}</option>)}</select></label>
            <label>Amount (₹, for refunds)<input name="amount" type="number" step="0.01" className="input mt-1 w-full" /></label>
            <label>Description<textarea name="description" required minLength={5} className="input mt-1 w-full" rows={3} /></label>
            <button className="btn btn-primary btn-sm">Raise</button>
          </ActionForm>
        </Card>
        <Card title="Exceptions queue" subtitle="Maker-checker: the raiser cannot decide; approved refunds post Dr 4000 / Cr client">
          {(exceptions ?? []).length === 0 ? <p className="text-sm text-muted">Nothing raised.</p> : (exceptions ?? []).map((e) => { const raiser = e.raiser as unknown as { full_name: string; email: string } | null; return (
            <div key={e.id} className="border-b border-border py-2 text-sm last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2"><span>#{e.id} <Badge tone="info">{e.kind}</Badge> {cc(e.account)} {e.amount ? <span className="tnum font-semibold">{money(e.amount)}</span> : null} <Badge tone={tone(e.status)}>{e.status}</Badge></span>
                {e.status === "open" && canDecide && <ActionForm action={decideException} className="flex gap-1"><input type="hidden" name="id" value={e.id} /><input name="note" className="input !py-1 !text-xs" placeholder="Decision note" /><button name="decision" value="approve" className="btn btn-primary btn-sm">Approve</button><button name="decision" value="reject" className="btn btn-ghost btn-sm">Reject</button></ActionForm>}</div>
              <div className="text-xs text-muted">{e.description}</div>
              <div className="text-xs text-faint">raised by {raiser?.full_name ?? raiser?.email ?? "—"} · {istTime(e.created_at)}{e.decided_at ? ` · decided ${istTime(e.decided_at)}${e.journal_entry_id ? ` · journal #${e.journal_entry_id}` : ""}` : ""}{e.decision_note ? ` · ${e.decision_note}` : ""}</div>
            </div>); })}
        </Card>
      </div>
    </>
  );
}
