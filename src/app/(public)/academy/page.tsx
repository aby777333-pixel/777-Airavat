import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import Link from "next/link";

export const metadata = { ...metadataFor("/academy") };

const lessons = [
  { level: "Beginner", title: "What a stockbroker actually does", body: "A broker routes your orders to an exchange, holds your funds in segregated client accounts, settles trades through a clearing corporation and keeps your shares in a demat account with a depository. AIRAVAT's sandbox simulates each of these roles separately so you can see where each rupee goes." },
  { level: "Beginner", title: "Market, limit and stop-loss orders", body: "A market order executes at the best available price right now. A limit order waits for your price or better. A stop-loss order rests until a trigger price is touched and then becomes a market (SL-M) or limit (SL) order. In the sandbox, limit and stop orders rest until the simulated price crosses them." },
  { level: "Beginner", title: "CNC vs MIS", body: "CNC (cash and carry) is delivery: you pay the full amount and the shares move to your demat holdings. MIS (margin intraday) is intraday: you post a margin, and the position is squared off before close. The sandbox risk engine squares off MIS positions in the end-of-day run." },
  { level: "Intermediate", title: "Why charges matter more than they look", body: "Brokerage can be zero, but STT, exchange transaction charges, SEBI fees, stamp duty and GST still apply. Use the brokerage calculator to see the break-even move per share before you trade frequently." },
  { level: "Intermediate", title: "How a risk engine protects you", body: "Before an order reaches an exchange, the RMS checks funds, holdings, price bands, lot and tick sizes, order size limits and the broker-wide kill switch. If any check fails the order is rejected with a reason. Rejections are a feature, not a bug." },
  { level: "Intermediate", title: "Reading your ledger", body: "Your funds balance is not a wallet number. It is the sum of credits and debits in a double-entry journal: deposits credit your account, buys debit it, sells credit it net of charges. Every line is visible in the Ledger page." },
  { level: "Advanced", title: "Order state machines", body: "RECEIVED → RMS_CHECK → ROUTED → ACKNOWLEDGED → PARTIALLY_FILLED / FILLED, or RMS_REJECTED / CANCELLED / EXPIRED. Terminal states cannot transition again. The ClearView order passport shows every event with timestamps." },
  { level: "Advanced", title: "Why 'simulated' is written everywhere", body: "A sandbox cannot reproduce real liquidity, slippage, rejections, outages or settlement failures. Treat every result here as an engineering demonstration, not as evidence of trading skill or future returns." },
];

const glossary = [
  ["LTP", "Last traded price."], ["Price band", "The daily range within which an instrument may trade; orders outside it are rejected."], ["Tick size", "The minimum price increment, ₹0.05 for most NSE equities."],
  ["Margin", "Collateral blocked against an open order or position."], ["Square-off", "Closing an open position; MIS positions are squared off before market close."], ["Settlement", "Exchange of funds and securities after a trade; T+1 in Indian cash markets."],
  ["STT", "Securities Transaction Tax, levied on the value of certain trades."], ["Maker-checker", "A control where the person who initiates an action cannot be the one who approves it."],
];

export default function Academy() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <PageHero variant="academy" intro={seoFor("/academy").intro}><PageHeader eyebrow="AIRAVAT Academy" title="Learn how markets actually work" subtitle="Plain-language lessons written to match what the sandbox does. Education, not advice. No course promises returns." /></PageHero>
      <Link href="/academy/chart-school" className="m-crystal mb-6 block p-6 transition hover:-translate-y-0.5">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">New · Chart School</div>
        <div className="font-display mt-1 text-xl font-semibold">24 candlestick patterns, 14 chart patterns, 10 indicators and 16 Indian-market essentials, animated and quizzed</div>
        <p className="mt-1 text-sm text-muted">Doji to three white soldiers, head and shoulders to cup and handle, VWAP to CPR, circuit filters to T+1. Open Chart School →</p>
      </Link>
      <div className="grid gap-4 md:grid-cols-2">
        {lessons.map((l) => (
          <article key={l.title} className="glass p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{l.level}</div>
            <h2 className="font-display mt-1 text-lg font-semibold">{l.title}</h2>
            <p className="mt-2 text-sm text-muted">{l.body}</p>
          </article>
        ))}
      </div>
      <section id="glossary" className="glass mt-10 scroll-mt-24 p-6">
        <h2 className="font-display text-xl font-semibold">Glossary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {glossary.map(([t, d]) => (<div key={t}><dt className="font-semibold">{t}</dt><dd className="text-sm text-muted">{d}</dd></div>))}
        </dl>
      </section>
    </div>
  );
}
