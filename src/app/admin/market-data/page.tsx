import { requireStaff } from "@/lib/auth";
import { money } from "@/lib/format";
import { Badge, Card, Notice, PageHeader } from "@/components/ui";
import ActionForm from "@/components/ActionForm";
import { addCorporateAction, addEconomicEvent, addIpo, allotIpo, applyCorporateActionsNow, setIpoStatus } from "./actions";

export default async function MarketDataAdmin() {
  const { supabase, profile } = await requireStaff("/admin/market-data");
  const can = ["ops", "admin", "super_admin", "editor"].includes(profile?.role ?? "");
  const [{ data: cas }, { data: events }, { data: ipos }, { data: instruments }] = await Promise.all([
    supabase.from("corporate_actions").select("*, instrument:instruments(symbol)").order("ex_date", { ascending: false }).limit(50),
    supabase.from("economic_events").select("*").order("event_date", { ascending: false }).limit(50),
    supabase.from("ipos").select("*, apps:ipo_applications(count)").order("open_date", { ascending: false }),
    supabase.from("instruments").select("id,symbol").eq("segment", "EQ").order("symbol"),
  ]);
  return (
    <>
      <PageHeader eyebrow="Market data" title="Corporate actions, calendar and IPO desk" subtitle="Staff-entered reference data for the public Markets pages and the sandbox posting engines. Every row carries its source; no licensed feed is connected." />
      <Notice tone="warn">Rows entered here are published immediately on public pages with the source you provide. Use SIMULATED SAMPLE for anything not taken from an official notification.</Notice>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Corporate actions" subtitle="Dividends credit cash; splits and bonuses adjust holdings and candle history on the ex-date (cron 10:05 IST)">
          {can && <ActionForm action={addCorporateAction} successText="Added." className="grid grid-cols-3 gap-2 text-sm"><select className="select" name="instrument_id" required>{(instruments ?? []).map((i) => <option key={i.id} value={i.id}>{i.symbol}</option>)}</select><select className="select" name="kind"><option>DIVIDEND</option><option>SPLIT</option><option>BONUS</option><option>RIGHTS</option><option>BUYBACK</option><option>AGM</option><option>RESULTS</option></select><input className="input" name="ex_date" type="date" required /><input className="input tnum" name="amount" type="number" step="0.01" placeholder="Dividend ₹/share" /><input className="input" name="ratio" placeholder="Ratio e.g. 1:1" /><input className="input" name="record_date" type="date" /><input className="input col-span-2" name="description" placeholder="Description" /><input className="input" name="source" placeholder="Source" defaultValue="SIMULATED SAMPLE" /><button className="btn btn-ghost btn-sm">Add</button></ActionForm>}
          <div className="mt-3 max-h-80 overflow-auto"><table className="table text-xs"><thead><tr><th>Ex-date</th><th>Stock</th><th>Kind</th><th>Detail</th><th>Status</th></tr></thead><tbody>{(cas ?? []).map((c) => <tr key={c.id}><td>{c.ex_date}</td><td>{(c.instrument as unknown as { symbol: string })?.symbol}</td><td>{c.kind}</td><td className="text-muted">{c.amount ? money(c.amount) : c.ratio} {c.description}</td><td><Badge tone={c.status === "applied" ? "ok" : "info"}>{c.status}</Badge></td></tr>)}</tbody></table></div>
          {can && <ActionForm action={applyCorporateActionsNow} successText="Applied due actions." className="mt-2"><button className="btn btn-ghost btn-sm">Apply due actions now</button></ActionForm>}
        </Card>
        <Card title="Economic calendar">
          {can && <ActionForm action={addEconomicEvent} successText="Added." className="grid grid-cols-3 gap-2 text-sm"><input className="input" name="event_date" type="date" required /><input className="input" name="event_time" type="time" /><select className="select" name="category"><option>policy</option><option>inflation</option><option>gdp</option><option>holiday</option><option>earnings</option><option>global</option></select><input className="input col-span-2" name="title" placeholder="Title" required /><select className="select" name="importance"><option>high</option><option>medium</option><option>low</option></select><input className="input" name="expected" placeholder="Expected" /><input className="input" name="previous" placeholder="Previous" /><input className="input" name="source" placeholder="Source" defaultValue="SIMULATED SAMPLE" /><button className="btn btn-ghost btn-sm col-span-3">Add event</button></ActionForm>}
          <div className="mt-3 max-h-80 overflow-auto"><table className="table text-xs"><thead><tr><th>Date</th><th>Title</th><th>Cat</th><th>Imp</th><th>Source</th></tr></thead><tbody>{(events ?? []).map((e) => <tr key={e.id}><td>{e.event_date}</td><td>{e.title}</td><td>{e.category}</td><td>{e.importance}</td><td className="text-faint">{e.source}</td></tr>)}</tbody></table></div>
        </Card>
        <Card title="IPO desk" subtitle="Open issues accept simulated applications; allotment runs a simulated lottery, releases blocks and credits holdings" className="xl:col-span-2">
          {can && <ActionForm action={addIpo} successText="Issue created." className="grid grid-cols-4 gap-2 text-sm"><input className="input col-span-2" name="name" placeholder="Issue name" required /><input className="input" name="symbol" placeholder="Symbol on listing" /><select className="select" name="board"><option>MAINBOARD</option><option>SME</option></select><input className="input tnum" name="price_band_low" type="number" placeholder="Band low" required /><input className="input tnum" name="price_band_high" type="number" placeholder="Band high" required /><input className="input tnum" name="lot_size" type="number" placeholder="Lot size" required /><input className="input tnum" name="issue_size_cr" type="number" placeholder="Issue size ₹ cr" /><input className="input" name="open_date" type="date" /><input className="input" name="close_date" type="date" /><input className="input" name="allotment_date" type="date" /><input className="input" name="listing_date" type="date" /><input className="input col-span-3" name="description" placeholder="Description" /><button className="btn btn-ghost btn-sm">Create issue</button></ActionForm>}
          <table className="table mt-3 text-xs"><thead><tr><th>Issue</th><th>Board</th><th>Band / lot</th><th>Dates</th><th>Applications</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{(ipos ?? []).map((i) => { const n = (i.apps as unknown as { count: number }[])?.[0]?.count ?? 0; return <tr key={i.id}><td>{i.name}<div className="text-faint">{i.symbol} · {i.source}</div></td><td>{i.board}</td><td>{money(i.price_band_low)}–{money(i.price_band_high)} / {i.lot_size}</td><td>{i.open_date} → {i.close_date}</td><td className="num">{n}</td><td><Badge tone={i.status === "open" ? "ok" : "info"}>{i.status}</Badge></td>
              <td className="flex flex-wrap gap-1">{can && i.status === "upcoming" && <ActionForm action={setIpoStatus}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="status" value="open" /><button className="btn btn-ghost btn-sm">Open</button></ActionForm>}{can && i.status === "open" && <ActionForm action={setIpoStatus}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="status" value="closed" /><button className="btn btn-ghost btn-sm">Close</button></ActionForm>}{["ops", "admin", "super_admin"].includes(profile?.role ?? "") && ["open", "closed"].includes(i.status) && <ActionForm action={allotIpo} successText="Allotment run."><input type="hidden" name="id" value={i.id} /><button className="btn btn-primary btn-sm">Run allotment</button></ActionForm>}</td></tr>; })}</tbody></table>
        </Card>
      </div>
    </>
  );
}
