import Link from "next/link";

const cols = [
  { h: "Trade", links: [["/platforms", "Platforms"], ["/markets", "Markets (simulated)"], ["/pricing", "Pricing"], ["/calculators", "Calculators"]] },
  { h: "Learn", links: [["/academy", "AIRAVAT Academy"], ["/academy#glossary", "Glossary"], ["/trust", "Investor protection"]] },
  { h: "Company", links: [["/about", "About AIRAVAT"], ["/trust", "Trust Centre"], ["/contact", "Contact"], ["/open-account", "Open account"]] },
  { h: "Legal", links: [["/legal/terms-of-use", "Terms of Use"], ["/legal/risk-disclosure", "Risk Disclosure"], ["/legal/privacy-policy", "Privacy Policy"], ["/legal/ai-assistant-terms", "AI Assistant Terms"]] },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-bg-2/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.618fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="font-display text-lg font-bold tracking-[0.18em]">AIRAVAT</div>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Power with precision. An independent Indian brokerage technology platform, currently in sandbox development.
          </p>
          <p className="mt-4 text-xs text-faint">
            Registered legal name, SEBI registration, exchange memberships and depository arrangements: <strong>not yet obtained</strong>. Placeholders are not claims of authorization.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{c.h}</div>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {c.links.map(([href, label]) => <li key={href}><Link className="hover:text-text" href={href}>{label}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-faint">
        Investments in securities markets are subject to market risks. Read all related documents carefully before investing. This sandbox uses simulated data and simulated funds only.
      </div>
    </footer>
  );
}
