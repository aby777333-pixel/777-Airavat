import Link from "next/link";
import { PageHeader, Badge } from "@/components/ui";

export const metadata = { title: "Platforms" };

const platforms = [
  { id: "one", name: "AIRAVAT ONE", status: "Sandbox live", tone: "ok" as const, body: "Browser trading for everyday investors: market watch, order ticket with margin preview, holdings, positions, funds and ledger.", features: ["Watchlists", "Market/Limit/SL orders", "Charges preview", "Portfolio P&L", "Consent vault"], href: "/app" },
  { id: "pro", name: "AIRAVAT PRO", status: "Planned", tone: "default" as const, body: "Professional multi-panel terminal with keyboard shortcuts, chart trading, market depth and research panels.", features: ["Custom layouts", "Command palette", "Depth ladder", "Multi-chart"], href: "/platforms" },
  { id: "guardian", name: "AIRAVAT GUARDIAN", status: "Sandbox live", tone: "ok" as const, body: "Independent, fail-closed risk management: every order is checked for funds, holdings, price bands, lot and tick sizes, order limits and a kill switch.", features: ["Pre-trade checks", "Margin holds", "Kill switch", "Audit trail"], href: "/app" },
  { id: "clearview", name: "AIRAVAT CLEARVIEW", status: "Sandbox live", tone: "ok" as const, body: "An order passport: see the lifecycle events, the simulated exchange acknowledgement, each fill, each charge and each ledger line.", features: ["Order timeline", "Charge breakdown", "Journal entries"], href: "/app/orders" },
  { id: "live", name: "AIRAVAT LIVE", status: "Sandbox live", tone: "ok" as const, body: "A calm, explainable AI assistant that can explain markets, products, charges and your own screen. It has no order tools by design.", features: ["Context-aware", "Multilingual (BHASHA)", "Interaction audit"], href: "/app" },
  { id: "core", name: "BROKER CORE", status: "Sandbox live", tone: "ok" as const, body: "Back-office console: client lifecycle, KYC queue, withdrawals with maker-checker, trial balance, reconciliation, risk limits, settlement and registers.", features: ["Double-entry ledger", "Maker-checker", "EOD settlement", "Regulatory register"], href: "/admin" },
  { id: "mobile", name: "AIRAVAT Mobile", status: "Planned", tone: "default" as const, body: "Native Android and iOS applications sharing the same authoritative backend.", features: ["Biometrics", "Push alerts", "Offline read-only"], href: "/platforms" },
  { id: "algo", name: "AIRAVAT ALGO & QUANT", status: "Planned", tone: "default" as const, body: "Strategy builder, backtesting, paper trading and developer APIs, gated by the regulatory algo framework.", features: ["Backtests", "Paper trading", "API keys"], href: "/platforms" },
];

export default function Platforms() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Platforms" title="The AIRAVAT product family" subtitle="Status labels are honest: 'Sandbox live' means working against simulated infrastructure. 'Planned' means designed, not built." />
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
