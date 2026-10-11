import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { money } from "@/lib/format";
import { Badge, Card, Empty, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { applyIpo, cancelIpo } from "./actions";

export default async function IpoDesk() {
  const { supabase, user } = await requireUser("/app/ipo");
  const account = await getAccount(supabase, user.id);
  if (!account) return <Empty title="No sandbox account" cta={{ href: "/app/onboarding", label: "Complete onboarding" }} />;
  const [{ data: ipos }, { data: apps }] = await Promise.all([supabase.from("ipos").select("*").order("open_date", { ascending: false }), supabase.from("ipo_applications").select("*, ipo:ipos(name,status)").eq("user_id", user.id).order("created_at", { ascending: false })]);
  return (
    <>
      <PageHeader eyebrow="IPO desk" title="Apply to public issues (simulated)" subtitle="Applications block simulated funds the way ASBA does; allotment is a simulated lottery run by operations after close." />
      <Notice tone="warn">Sandbox issues are labelled SIMULATED SAMPLE. No UPI mandate, registrar or exchange IPO platform is connected.</Notice>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-4">
          {(ipos ?? []).map((i) => (
            <div key={i.id} className={i.status === "open" ? "m-sapphire-edge p-5" : "glass p-5"}>
              <div className="flex items-start justify-between"><div><div className="font-display font-semibold">{i.name}</div><div className="text-xs text-muted">{i.board} · band {money(i.price_band_low)}–{money(i.price_band_high)} · lot {i.lot_size} · {i.open_date} → {i.close_date}</div></div><Badge tone={i.status === "open" ? "ok" : "info"}>{i.status}</Badge></div>
              {i.status === "open" && (
                <ActionForm action={applyIpo} successText="Applied; funds blocked (simulated)." className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <input type="hidden" name="ipo_id" value={i.id} />
                  <label className="block"><span className="label">Lots (max 13)</span><input className="input tnum" name="lots" type="number" min={1} max={13} defaultValue={1} /></label>
                  <label className="block"><span className="label">Bid price</span><input className="input tnum" name="bid" type="number" step={1} min={i.price_band_low} max={i.price_band_high} defaultValue={i.price_band_high} /></label>
                  <div className="flex items-end"><button className="btn btn-primary btn-sm w-full">Apply</button></div>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
        <Card title="My applications">
          {(apps ?? []).length === 0 ? <p className="text-sm text-muted">None.</p> : (apps ?? []).map((a) => { const ipo = (Array.isArray(a.ipo) ? a.ipo[0] : a.ipo) as { name: string; status: string } | null; return (
            <div key={a.id} className="border-b border-border py-2 text-sm last:border-0"><div className="flex items-center justify-between"><span className="font-medium">{ipo?.name}</span><Badge tone={a.status === "allotted" ? "ok" : a.status === "not_allotted" || a.status === "cancelled" ? "bad" : "info"}>{a.status}</Badge></div><div className="text-xs text-muted">{a.lots} lots @ {money(a.bid_price)} · blocked {money(a.amount)}{a.allotted_qty ? ` · allotted ${a.allotted_qty} shares` : ""}</div>
              {a.status === "applied" && ipo?.status === "open" && <ActionForm action={cancelIpo} className="mt-1"><input type="hidden" name="id" value={a.id} /><button className="btn btn-ghost btn-sm">Withdraw</button></ActionForm>}</div>); })}
        </Card>
      </div>
    </>
  );
}
