import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { MarketCrumbs } from "../_shared";

export const metadata = { title: "IPO calendar: upcoming, open and listed issues (sandbox)", description: "Mainboard and SME IPOs with price bands, lot sizes, issue size, open and close dates, allotment and listing dates. Apply in the sandbox with simulated funds.", keywords: ["upcoming IPO", "IPO calendar India", "SME IPO list", "IPO price band lot size", "IPO allotment date"] };

export default async function IpoCalendar() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("ipos").select("*").order("open_date", { ascending: false });
  const tone = (s: string) => (s === "open" ? "ok" : s === "upcoming" ? "info" : "default");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <MarketCrumbs label="IPO calendar" />
      <PageHero variant="partners" intro="The IPO calendar lists public issues by status with their price band, lot size, issue size and key dates. A retail application blocks funds through ASBA until allotment; in the sandbox, applications block simulated funds and a simulated lottery allots shares."><PageHeader eyebrow="Markets" title="IPO calendar" /></PageHero>
      <Notice tone="warn">No exchange IPO feed is connected; issues marked SIMULATED SAMPLE demonstrate the application and allotment workflow end to end.</Notice>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {(rows ?? []).map((i) => (
          <div key={i.id} className={i.status === "open" ? "m-sapphire-edge p-5" : "glass p-5"}>
            <div className="flex items-start justify-between gap-2"><div><div className="font-display font-semibold">{i.name}</div><div className="text-xs text-muted">{i.board} · {i.symbol ?? "symbol TBA"} · {i.registrar}</div></div><Badge tone={tone(i.status)}>{i.status}</Badge></div>
            <p className="mt-2 text-sm text-muted">{i.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs"><dt className="text-muted">Price band</dt><dd className="tnum">{money(i.price_band_low)} – {money(i.price_band_high)}</dd><dt className="text-muted">Lot size</dt><dd className="tnum">{i.lot_size} shares (min {money((i.lot_size ?? 0) * (i.price_band_high ?? 0))})</dd><dt className="text-muted">Issue size</dt><dd className="tnum">₹{i.issue_size_cr} crore</dd><dt className="text-muted">Open – close</dt><dd>{i.open_date} → {i.close_date}</dd><dt className="text-muted">Allotment / listing</dt><dd>{i.allotment_date} / {i.listing_date}</dd></dl>
            <div className="mt-3 flex items-center justify-between text-xs"><span className="text-faint">{i.source}</span>{i.status === "open" && <Link href={`/login?next=/app/ipo`} className="btn btn-primary btn-sm">Apply (simulated)</Link>}</div>
          </div>
        ))}
        {(rows ?? []).length === 0 && <p className="text-sm text-muted">No issues recorded.</p>}
      </div>
    </div>
  );
}
