import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import Link from "next/link";
import { PageHeader, Badge } from "@/components/ui";

export const metadata = { ...metadataFor("/platforms") };

const platforms = [
  { id: "one", name: "AIRAVAT ONE", status: "Sandbox live", tone: "ok" as const, body: "Browser trading for everyday investors: market watch, order ticket with margin preview, holdings, positions, funds and ledger.", features: ["Watchlists", "Market/Limit/SL orders", "Charges preview", "Portfolio P&L", "Consent vault"], href: "/app" },
  { id: "pro", name: "AIRAVAT PRO · Terminal X", status: "Sandbox live", tone: "ok" as const, body: "Professional multi-panel terminal: watchlist, chart, simulated depth, one-click ticket, positions and the command palette in one workspace.", features: ["Multi-panel layout", "Command palette", "Depth ladder", "Advanced orders"], href: "/trade/terminal-x" },
  { id: "guardian", name: "AIRAVAT GUARDIAN", status: "Sandbox live", tone: "ok" as const, body: "Independent, fail-closed risk management: every order is checked for funds, holdings, price bands, lot and tick sizes, order limits and a kill switch.", features: ["Pre-trade checks", "Margin holds", "Kill switch", "Audit trail"], href: "/app" },
  { id: "clearview", name: "AIRAVAT CLEARVIEW", status: "Sandbox live", tone: "ok" as const, body: "An order passport: see the lifecycle events, the simulated exchange acknowledgement, each fill, each charge and each ledger line.", features: ["Order timeline", "Charge breakdown", "Journal entries"], href: "/app/orders" },
  { id: "live", name: "AIRAVAT LIVE", status: "Sandbox live", tone: "ok" as const, body: "A calm, explainable AI assistant that can explain markets, products, charges and your own screen. It has no order tools by design.", features: ["Context-aware", "Multilingual (BHASHA)", "Interaction audit"], href: "/app" },
  { id: "core", name: "BROKER CORE", status: "Sandbox live", tone: "ok" as const, body: "Back-office console: client lifecycle, KYC queue, withdrawals with maker-checker, trial balance, reconciliation, risk limits, settlement and registers.", features: ["Double-entry ledger", "Maker-checker", "EOD settlement", "Regulatory register"], href: "/admin" },
  { id: "mobile", name: "AIRAVAT Mobile", status: "PWA now · native planned", tone: "info" as const, body: "The web app installs as a progressive web app on Android and iOS today; native applications sharing the same backend are planned.", features: ["Install as app", "Responsive terminal", "Push alerts (planned)"], href: "/downloads" },
  { id: "algo", name: "AIRAVAT ALGO & QUANT", status: "Sandbox live", tone: "ok" as const, body: "Strategy DNA backtesting with fingerprint and robustness, Shadow Portfolio paper trading and sandbox trading APIs. Live algo execution waits for the exchange algo framework.", features: ["Backtests", "Paper trading", "API keys"], href: "/trade/algo-studio" },
];

export default function Platforms() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHero variant="platforms" intro={seoFor("/platforms").intro}><PageHeader eyebrow="Platforms" title="The AIRAVAT product family" subtitle="Status labels are honest: 'Sandbox live' means working against simulated infrastructure. 'Planned' means designed, not built." /></PageHero>
      <div className="grid gap-5 md:grid-cols-2">
        {platforms.map((p) => (
          <section id={p.id} key={p.id} className="glass scroll-mt-24 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{p.name}</div>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </div>
              <Badge tone={p.tone}>{p.status}</Badge>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {p.features.map((f) => <li key={f} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted">{f}</li>)}
            </ul>
            {p.status === "Sandbox live" && <Link href={p.href} className="mt-4 inline-block text-sm text-accent hover:underline">Open →</Link>}
          </section>
        ))}
      </div>
    </div>
  );
}
