import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/invest/bonds") };
const KINDS: [string, string, string][] = [["gsec", "Government securities", "Dated sovereign bonds, 5 to 40 years, half-yearly coupons"], ["tbill", "Treasury bills", "91, 182 and 364-day zero-coupon sovereign paper"], ["sdl", "State development loans", "State government bonds, a little above G-Sec yields"], ["corporate", "Corporate bonds", "Rated company debt on the exchange debt segment"], ["ncd", "NCD public issues", "Non-convertible debentures offered to the public via ASBA"], ["sgb", "Sovereign Gold Bonds", "Gold-linked sovereign bonds paying 2.5% a year"]];

export default async function Bonds({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("bonds").select("*").order("kind").order("maturity_date");
  const all = data ?? [];
  const kind = KINDS.some(([k]) => k === sp.kind) ? sp.kind! : "";
  const rows = kind ? all.filter((b) => b.kind === kind) : all;
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/invest/bonds", label: "Invest" }, { href: "#", label: "Bonds" }]} />
      <PageHero variant="pricing" intro={seoFor("/invest/bonds").intro}><PageHeader eyebrow="Fixed income" title="Bonds, G-Secs, T-bills, SDLs, NCDs and SGBs" subtitle={<span className="inline-flex items-center gap-2">Sample catalogue with yields, maturities and tax treatment <SimBadge /></span>} /></PageHero>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {KINDS.map(([k, l, d]) => <Link key={k} href={`/invest/bonds?kind=${k}`} className={clsx("glass block p-4 transition hover:-translate-y-0.5", kind === k && "ring-1 ring-accent")}><div className="font-display font-semibold">{l}</div><div className="text-xs text-muted">{d}</div><div className="mt-1 text-xs text-faint">{all.filter((b) => b.kind === k).length} listed</div></Link>)}
      </div>
      <div className="glass mt-5 overflow-x-auto p-2">
        <table className="table text-sm"><thead><tr><th>Instrument</th><th>Issuer</th><th className="num">Coupon</th><th className="num">YTM</th><th>Maturity</th><th className="num">Price</th><th>Rating</th><th>Interest</th><th className="num">Min</th><th>How to buy</th></tr></thead>
          <tbody>{rows.map((b) => <tr key={b.id}><td><div className="font-semibold">{b.name}</div>{b.isin && <div className="font-mono text-xs text-faint">{b.isin}</div>}{b.kind === "ncd" && b.issue_open && <div className="text-xs text-accent">Issue {b.issue_open} → {b.issue_close}</div>}</td><td className="text-muted">{b.issuer}</td><td className="num">{b.coupon_pct ? `${Number(b.coupon_pct).toFixed(2)}%` : "—"}</td><td className="num">{b.ytm_pct ? `${Number(b.ytm_pct).toFixed(2)}%` : "—"}</td><td>{b.maturity_date}</td><td className="num">{b.price ? Number(b.price).toFixed(2) : "—"} <span className="text-xs text-faint">/ {Number(b.face_value)}</span></td><td><Badge tone={String(b.rating).startsWith("Sovereign") ? "ok" : "info"}>{b.rating}</Badge></td><td className="text-xs text-muted">{b.interest_frequency}</td><td className="num">{money(b.min_investment)}</td><td className="text-xs text-muted">{b.how_to_buy}</td></tr>)}</tbody></table>
      </div>
      {rows.length > 0 && <div className="mt-4 space-y-2">{rows.filter((b) => b.tax_note).slice(0, kind ? 20 : 6).map((b) => <div key={b.id} className="text-xs text-muted"><strong className="text-text">{b.name}</strong>: {b.tax_note}</div>)}</div>}
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <div className="glass p-5"><div className="font-display font-semibold">RBI Retail Direct</div><p className="mt-2 text-sm text-muted">Individuals can open a free gilt account with the RBI and bid in primary auctions of G-Secs, T-bills, SDLs and SGBs, with no brokerage. AIRAVAT explains the process and links out; it does not intermediate the account.</p></div>
        <div className="glass p-5"><div className="font-display font-semibold">Price, yield and duration</div><p className="mt-2 text-sm text-muted">Bond prices move opposite to yields; the longer the maturity, the larger the move. Yield to maturity assumes coupons are reinvested at the same rate and the bond is held to maturity.</p><Link href="/tools/cagr-calculator" className="mt-2 inline-block text-xs text-accent">Compare with CAGR →</Link></div>
        <div className="glass p-5"><div className="font-display font-semibold">Credit risk</div><p className="mt-2 text-sm text-muted">Ratings from AAA to D grade default risk; anything below BBB− is non-investment grade. Higher coupons compensate for that risk. Check the issuer, security cover and the rating rationale before buying corporate paper.</p></div>
      </div>
      <div className="mt-5"><Notice tone="warn">SIMULATED SAMPLE instruments and prices. Secondary-market bond trading needs the exchange debt segment and clearing arrangements; NCD applications need ASBA. Both are listed as blockers on the Market Atlas.</Notice></div>
    </div>
  );
}
