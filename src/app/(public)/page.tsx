import Link from "next/link";
import Image from "next/image";
import { getMarketStatus, getQuotes } from "@/lib/market";
import { changeOf, price, pct } from "@/lib/format";
import { SimBadge } from "@/components/ui";
import clsx from "clsx";
import Awakening from "@/components/site/Awakening";
import MorningIntelligence from "@/components/site/MorningIntelligence";
import { AcademyPricingTrust, FinalCta, IntelligenceStrip, ProductDiscovery, TerminalShowcase } from "@/components/site/HomeSections";

const products = [
  { name: "AIRAVAT ONE", who: "Everyday investors", body: "Clean investing, transparent charges and a portfolio that explains itself.", href: "/platforms#one" },
  { name: "AIRAVAT PRO", who: "Active traders", body: "Dense workspaces, keyboard-first order entry, chart trading and risk monitors.", href: "/platforms#pro" },
  { name: "AIRAVAT GUARDIAN", who: "Everyone", body: "A fail-closed risk engine that checks every order before it reaches an exchange.", href: "/platforms#guardian" },
  { name: "AIRAVAT CLEARVIEW", who: "Everyone", body: "Trace any order through execution, charges, ledger entries and settlement.", href: "/platforms#clearview" },
  { name: "AIRAVAT LIVE", who: "Everyone", body: "An explainable AI copilot that researches and explains, and never places trades.", href: "/platforms#live" },
  { name: "BROKER CORE", who: "Operations", body: "Double-entry ledger, maker-checker approvals, reconciliation and audit trails.", href: "/platforms#core" },
];

const journey = ["Discover", "Register", "KYC", "Activation", "Funding", "Trade", "Risk checks", "Settle", "Portfolio", "Reports"];

export default async function Home() {
  const [rows, ms] = await Promise.all([getQuotes(), getMarketStatus()]);
  const eq = rows.filter((r) => r.segment === "EQ").map((r) => ({ ...r, ...changeOf(r.quote.ltp, r.quote.prev_close) }));
  const gainers = [...eq].sort((a, b) => b.changePct - a.changePct).slice(0, 5);
  const losers = [...eq].sort((a, b) => a.changePct - b.changePct).slice(0, 5);
  const indices = rows.filter((r) => r.segment === "INDEX");

  return (
    <>
      <Awakening />
      {/* HERO */}
      <section className="on-night relative overflow-hidden">
        <Image src="/brand/hero-mumbai.jpg" alt="" fill priority sizes="100vw" className="pointer-events-none object-cover object-[70%_60%] opacity-70" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#0c1116_0%,rgba(12,17,22,0.88)_32%,rgba(12,17,22,0.55)_60%,rgba(12,17,22,0.35)_100%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,#0c1116)]" aria-hidden="true" />
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-accent/10 blur-3xl drift" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-40 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-2/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1400px] gap-12 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-24">
          <div>
            <div className="rise inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              <span className="h-px w-8 bg-accent" /> The Indian brokerage house, built in the open
            </div>
            <h1 className="rise-2 font-display mt-5 text-4xl font-bold leading-[1.05] sm:text-6xl">
              Power with <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">precision.</span>
            </h1>
            <p className="rise-3 mt-6 max-w-xl text-lg text-muted">
              AIRAVAT is an independent Indian securities platform in sandbox development. Open a simulated account, fund it with simulated money,
              and watch every order pass through a real risk engine, a real order state machine and a real double-entry ledger.
            </p>
            <div className="rise-3 mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">Open a sandbox account</Link>
              <Link href="/platforms" className="btn btn-ghost">Explore platforms</Link>
            </div>
            <div className="rise-3 mt-8 flex flex-wrap items-center gap-4 text-xs text-faint">
              <span className="inline-flex items-center gap-2">
                <span className={clsx("h-2 w-2 rounded-full", ms.status === "OPEN" ? "bg-profit" : "bg-warn")} />
                Market session {ms.status}{ms.sandbox_extended_hours && ms.status !== "OPEN" ? " · sandbox accepting orders" : ""}
              </span>
              <SimBadge />
              <span>No SEBI registration or exchange membership is claimed.</span>
            </div>
          </div>

          <div className="rise-2 relative hidden min-h-[520px] md:-mb-20 md:block">
            <div className="pointer-events-none absolute inset-x-8 bottom-10 top-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(90,176,232,0.22),transparent_65%)] blur-2xl" aria-hidden="true" />
            <Image src="/brand/hero-people.webp" alt="Investors and traders from across India greeting with namaste, holding charts" fill priority sizes="(min-width: 768px) 46vw, 100vw" className="object-cover object-[50%_100%]" />
          </div>
        </div>
      </section>

      {/* MARKET PULSE (moved out of the hero so the artwork stands alone) */}
      <section className="mx-auto max-w-[1400px] px-4 pt-6 sm:px-6" aria-label="Market pulse">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-faint"><span className="h-px w-6 bg-accent" /> Market pulse · simulated</div>
        <div className="glass p-5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] md:gap-8">
              <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="font-display text-sm font-semibold">Market pulse</div>
                <SimBadge />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {indices.map((i) => {
                  const c = changeOf(i.quote.ltp, i.quote.prev_close);
                  return (
                    <div key={i.symbol} className="rounded-xl border border-border bg-bg/40 p-3">
                      <div className="text-xs text-muted">{i.symbol}</div>
                      <div className="tnum font-display text-xl font-semibold">{price(i.quote.ltp)}</div>
                      <div className={clsx("tnum text-xs", c.change >= 0 ? "text-profit" : "text-loss")}>{pct(c.changePct)}</div>
                    </div>
                  );
                })}
              </div>
              </div>
              <div>
              <div className="grid grid-cols-2 gap-4 text-xs md:mt-0">
                <div>
                  <div className="mb-1 font-semibold text-profit">Top gainers</div>
                  {gainers.map((g) => (
                    <Link key={g.symbol} href={`/markets/${g.symbol}`} className="tnum flex justify-between py-1 hover:text-accent">
                      <span>{g.symbol}</span><span className="text-profit">{pct(g.changePct)}</span>
                    </Link>
                  ))}
                </div>
                <div>
                  <div className="mb-1 font-semibold text-loss">Top losers</div>
                  {losers.map((g) => (
                    <Link key={g.symbol} href={`/markets/${g.symbol}`} className="tnum flex justify-between py-1 hover:text-accent">
                      <span>{g.symbol}</span><span className="text-loss">{pct(g.changePct)}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/markets" className="mt-4 block text-center text-xs text-accent hover:underline">Open market overview →</Link>
            </div>
              </div>
      </section>

      <ProductDiscovery />
      <TerminalShowcase />
      <IntelligenceStrip />
      <MorningIntelligence />

      {/* JOURNEY */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">The client lifecycle, end to end</div>
        <div className="mt-6 flex flex-wrap gap-2">
          {journey.map((j, i) => (
            <div key={j} className="glass flex items-center gap-2 px-3 py-2 text-sm">
              <span className="tnum text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>{j}
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-sm text-muted">
          The first technical milestone is already live in this sandbox: a client opens a test account, receives simulated funds, views clearly
          labelled simulated market data, places an order, passes risk validation, receives a simulated execution, sees the position and P&L, and
          every rupee is reconciled in the back office.
        </p>
      </section>

      {/* PRODUCTS */}
      <section className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <h2 className="font-display text-3xl font-bold">One ecosystem. Every role.</h2>
        <p className="mt-2 max-w-2xl text-muted">From a first-time investor to a professional desk to the operations team reconciling the books.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.name} href={p.href} className="glass group p-6 transition hover:-translate-y-0.5 hover:border-border-strong">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.name}</div>
              <div className="mt-1 text-xs text-faint">{p.who}</div>
              <p className="mt-3 text-sm text-muted">{p.body}</p>
              <div className="mt-4 text-xs text-accent opacity-0 transition group-hover:opacity-100">Learn more →</div>
            </Link>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["Financial correctness first", "Money is stored as exact decimals. Every trade posts a balanced journal entry. Corrections are reversals, never overwrites."],
            ["Risk that cannot be bypassed", "Orders are validated server-side for funds, holdings, price bands, lot sizes, tick sizes and a broker-wide kill switch."],
            ["Honest about readiness", "Everything you see here is simulated and labelled. Live trading stays disabled until regulatory, exchange and certification gates are satisfied."],
          ].map(([h, b]) => (
            <div key={h} className="glass p-6">
              <div className="font-display text-lg font-semibold">{h}</div>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <AcademyPricingTrust />
      <FinalCta />
    </>
  );
}
