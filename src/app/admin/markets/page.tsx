import { requireStaff } from "@/lib/auth";
import { istTime } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { updateMarketStage } from "../ops/actions";

const STAGES = ["research", "regulatory_assessment", "infrastructure", "development", "testing", "certification", "compliance_approval", "pilot", "sandbox_live", "production_live", "not_enabled"];

export default async function MarketsAdmin() {
  const { supabase, profile } = await requireStaff("/admin/markets");
  const { data: rows } = await supabase.from("market_access_matrix").select("*").order("id");
  const can = ["compliance", "admin", "super_admin"].includes(profile?.role ?? "");
  return (
    <>
      <PageHeader eyebrow="Market Launch Console" title="Market Access Matrix" subtitle="Every exchange and segment with its honest stage and gates. Stage changes are audited. Trading can be enabled only for sandbox_live markets; production markets need the regulatory approval workflow, which is not automated here." />
      <Notice tone="warn">Offshore FX/CFD remains not_enabled by policy. The live trading gate in System settings is separate and untouched by this console.</Notice>
      <div className="glass mt-4 overflow-x-auto p-2">
        <table className="table text-xs">
          <thead><tr><th>Market</th><th>Stage</th><th>Gates</th><th>Feed</th><th>Trading</th><th>Updated</th>{can && <th>Change</th>}</tr></thead>
          <tbody>{(rows ?? []).map((m) => (
            <tr key={m.id}>
              <td><div className="font-medium">{m.name}</div><div className="text-muted">{m.exchange} · {m.segment} · {m.product_family}</div>{m.regulatory_notes && <div className="mt-1 max-w-xs text-faint">{m.regulatory_notes}</div>}</td>
              <td><Badge tone={m.stage === "sandbox_live" ? "ok" : m.stage === "not_enabled" ? "bad" : "info"}>{m.stage.replace(/_/g, " ")}</Badge></td>
              <td className="space-x-1"><Badge tone={m.entity_authorized ? "ok" : "bad"}>entity</Badge><Badge tone={m.exchange_membership ? "ok" : "bad"}>membership</Badge><Badge tone={m.clearing_arrangement ? "ok" : "bad"}>clearing</Badge></td>
              <td>{m.data_feed}</td><td>{m.trading_enabled ? <Badge tone="ok">sandbox</Badge> : <Badge tone="bad">off</Badge>}</td><td className="text-muted">{istTime(m.updated_at, false)}</td>
              {can && <td><ActionForm action={updateMarketStage} successText="Updated." className="grid w-64 gap-1"><input type="hidden" name="id" value={m.id} /><select className="select" name="stage" defaultValue={m.stage}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select><select className="select" name="data_feed" defaultValue={m.data_feed}><option>none</option><option>synthetic</option><option>delayed</option><option>realtime</option></select><input className="input" name="regulatory_notes" placeholder="Regulatory note" /><label className="flex items-center gap-1"><input type="checkbox" name="trading_enabled" defaultChecked={m.trading_enabled} /> trading enabled (sandbox_live only)</label><button className="btn btn-ghost btn-sm">Save</button></ActionForm></td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
