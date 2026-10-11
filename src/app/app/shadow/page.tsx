import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { istTime, money } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { createShadow } from "../intel/actions";

export default async function Shadow() {
  const { supabase, user } = await requireUser("/app/shadow");
  const { data: pfs } = await supabase.from("shadow_portfolios").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
  const vals = await Promise.all((pfs ?? []).map(async (p) => ({ id: p.id, v: (await supabase.rpc("shadow_valuation", { p_portfolio: p.id })).data as { total: number; return_pct: number } | null })));
  const vmap = new Map(vals.map((x) => [x.id, x.v]));
  return (
    <>
      <PageHeader eyebrow="Shadow Portfolio" title="Hypothetical portfolios" subtitle="Simulated money, simulated fills at the current simulated quote, sandbox charges. Completely isolated from your trading account and the order system." />
      <Notice tone="info">Shadow portfolios never create orders, never touch funds and are clearly labelled hypothetical everywhere they appear.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.618fr]">
        <Card title="New shadow portfolio">
          <ActionForm action={createShadow} successText="Created. Refresh to open it." className="space-y-2 text-sm">
            <input className="input" name="name" placeholder="Name" required />
            <label className="block"><span className="label">Starting cash (simulated)</span><input className="input tnum" name="cash" type="number" defaultValue={1000000} min={10000} max={100000000} /></label>
            <textarea className="input" name="thesis" rows={2} placeholder="Thesis (optional)" />
            <button className="btn btn-primary btn-sm">Create</button>
          </ActionForm>
        </Card>
        <Card title={`Your portfolios (${(pfs ?? []).length})`}>
          {(pfs ?? []).length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
            <ul className="divide-y divide-border">{(pfs ?? []).map((p) => { const v = vmap.get(p.id); return (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div><Link href={`/app/shadow/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link> <Badge tone="sim">hypothetical</Badge><div className="text-xs text-muted">{p.thesis || "No thesis recorded"} · {istTime(p.created_at, false)}</div></div>
                {v && <div className="text-right"><div className="tnum font-semibold">{money(v.total)}</div><div className={v.return_pct >= 0 ? "tnum text-xs text-profit" : "tnum text-xs text-loss"}>{v.return_pct}%</div></div>}
              </li>); })}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
