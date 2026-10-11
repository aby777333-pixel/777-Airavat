import Link from "next/link";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/server";
import { istTime } from "@/lib/format";
import { isoAgo } from "@/lib/time";
import { Badge } from "@/components/ui";
import { NAV_GROUPS } from "@/lib/navigation";
import { SHOWROOM } from "@/lib/showroom";

const invest = NAV_GROUPS.find((g) => g.key === "invest")!.links;

export function ProductDiscovery() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6" aria-labelledby="h-invest">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Invest</div>
      <h2 id="h-invest" className="font-display mt-2 text-3xl font-bold">Every product, honestly labelled</h2>
      <p className="mt-2 max-w-2xl text-muted">Stocks, mutual funds, ETFs, IPOs, bonds, REITs and gold, each with its real availability: sandbox live, research-only, or designed and waiting on approvals.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{invest.map((l) => <Link key={l.href} href={l.href} className="m-crystal magnetic p-5"><div className="flex items-center justify-between"><span aria-hidden="true" className="text-2xl">{l.icon}</span><Badge tone={l.badge === "sandbox" ? "ok" : l.badge === "research" ? "default" : "info"}>{l.badge === "sandbox" ? "sandbox live" : l.badge === "research" ? "research" : "designed"}</Badge></div><div className="font-display mt-3 font-semibold">{l.label}</div><div className="text-xs text-muted">{l.desc}</div></Link>)}</div>
    </section>
  );
}

export function TerminalShowcase() {
  const shot = SHOWROOM.find((s) => s.id === "ticket");
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6" aria-labelledby="h-terminal">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.618fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Trade · Terminal X</div>
          <h2 id="h-terminal" className="font-display mt-2 text-3xl font-bold">A professional terminal on an honest engine</h2>
          <p className="mt-3 text-muted">Watchlist, chart, simulated depth, one-click ticket and positions in one workspace. Market, limit, stop orders at the exchange; GTT, after-market, bracket, cover, trailing stop, iceberg and basket orders managed by the broker and evaluated every minute. Every order passes the same fail-closed risk engine.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/trade/terminal-x" className="btn btn-primary">Explore Terminal X</Link><Link href="/trade/equity-trading" className="btn btn-ghost">Order types</Link><Link href="/tools/options-payoff-calculator" className="btn btn-ghost">Options builder</Link></div>
        </div>
        <Link href="/showroom" className="m-obsidian overflow-hidden p-2">{shot?.src ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={shot.src} alt={`${shot.module}: ${shot.title}`} className="rounded-xl" loading="lazy" /> : <div className="p-10 text-center text-sm text-muted">Screenshot pending</div>}</Link>
      </div>
    </section>
  );
}

export async function IntelligenceStrip() {
  const supabase = await createClient();
  const [{ data: results }, { count: alerts }] = await Promise.all([
    supabase.from("scanner_results").select("matched_at, scanner:scanners(name), instrument:instruments(symbol)").order("matched_at", { ascending: false }).limit(6),
    supabase.from("sentinel_alerts").select("id", { count: "exact", head: true }).gte("created_at", isoAgo(86400000)),
  ]);
  const cards = [
    { href: "/research", t: "Research ONE", b: "Evidence boards, scanners, backtests, paper trading and an AI council that argues both sides. Never advice." },
    { href: "/intelligence/sentinel-x", t: "Sentinel X", b: `Explainable risk alerts, pre-mortems before every order and decision twins for open positions. ${alerts ?? 0} alerts raised across the sandbox in the last day.` },
    { href: "/intelligence/scanner-matrix", t: "Scanner Matrix", b: "Ten system scanners every five minutes over derived metrics, plus a no-code builder with recorded evidence." },
    { href: "/platforms#live", t: "AIRAVAT LIVE", b: "A calm AI assistant that explains markets, charges and your own screen in Indian languages. It has no order tools by design." },
  ];
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6" aria-labelledby="h-intel">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Intelligence</div>
      <h2 id="h-intel" className="font-display mt-2 text-3xl font-bold">Research that shows its evidence</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">{cards.map((c) => <Link key={c.href} href={c.href} className="m-sapphire-edge magnetic p-5"><div className="font-display font-semibold">{c.t}</div><p className="mt-2 text-sm text-muted">{c.b}</p></Link>)}</div>
      <div className="glass mt-4 flex flex-wrap items-center gap-3 p-3 text-xs"><span className="badge badge-sim">latest scanner matches</span>{(results ?? []).map((r, i) => { const s = (Array.isArray(r.scanner) ? r.scanner[0] : r.scanner) as { name: string } | null; const ins = (Array.isArray(r.instrument) ? r.instrument[0] : r.instrument) as { symbol: string } | null; return <span key={i} className="text-muted"><strong className="text-text">{ins?.symbol}</strong> {s?.name} · {istTime(r.matched_at, false)}</span>; })}{(results ?? []).length === 0 && <span className="text-muted">No matches yet today.</span>}</div>
    </section>
  );
}

export function AcademyPricingTrust() {
  return (
    <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/academy" className="glass p-6"><div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Learn</div><div className="font-display mt-2 text-xl font-semibold">Academy, guides, courses, glossary</div><p className="mt-2 text-sm text-muted">Plain-language lessons written to match what the sandbox does, with tutorials you complete in the app and a daily journal reviewed before publication.</p><span className="mt-3 inline-block text-xs text-accent">Start learning →</span></Link>
        <Link href="/pricing" className="m-crystal p-6"><div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Transparent pricing</div><div className="font-display mt-2 text-xl font-semibold">₹0 delivery · ₹20 intraday and F&O</div><p className="mt-2 text-sm text-muted">Every statutory levy, DP charge, AMC and BSDA rule published in full and applied by a versioned catalogue with maker-checker approval. No hidden charges, by construction.</p><span className="mt-3 inline-block text-xs text-accent">See all charges →</span></Link>
        <Link href="/trust" className="glass p-6"><div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Trust & security</div><div className="font-display mt-2 text-xl font-semibold">Honest status, real controls</div><p className="mt-2 text-sm text-muted">No SEBI registration or exchange membership is claimed. What exists is a double-entry ledger, an independent risk engine, maker-checker approvals and a full audit log, all inspectable.</p><span className="mt-3 inline-block text-xs text-accent">Read the Trust Centre →</span></Link>
      </div>
    </section>
  );
}

export function FinalCta({ className }: { className?: string }) {
  return (
    <section className={clsx("mx-auto max-w-[1400px] px-4 py-16 sm:px-6", className)}>
      <div className="m-crystal sheen flex flex-col items-center gap-4 p-10 text-center">
        <h2 className="font-display text-3xl font-bold">Open a sandbox account</h2>
        <p className="max-w-xl text-muted">Two minutes. Simulated KYC, simulated funds, real engineering: risk checks, a double-entry ledger and an order passport for every trade.</p>
        <div className="flex flex-wrap justify-center gap-3"><Link href="/signup" className="btn btn-primary">Open account</Link><Link href="/showroom" className="btn btn-ghost">See the product</Link><Link href="/learn/beginner-guides" className="btn btn-ghost">Beginner guides</Link></div>
      </div>
    </section>
  );
}
