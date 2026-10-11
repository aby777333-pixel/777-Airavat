import Link from "next/link";
import { NAV_GROUPS } from "@/lib/navigation";

export default function Footer() {
  return (
    <footer className="on-night mt-24 border-t border-border bg-bg-2/60">
      <div className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="font-display text-lg font-bold tracking-[0.18em]">AIRAVAT</div>
            <p className="mt-3 max-w-sm text-sm text-muted">Power with precision. An independent Indian stock broker and trading technology platform, currently in sandbox development.</p>
            <p className="mt-4 text-xs text-faint">Registered legal name, SEBI registration, exchange memberships and depository arrangements: <strong>not yet obtained</strong>. Nothing on this site is a claim of authorization. All market data and funds shown are simulated.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs"><Link className="btn btn-ghost btn-sm" href="/open-account">Open account</Link><Link className="btn btn-ghost btn-sm" href="/company/support">Support</Link><Link className="btn btn-ghost btn-sm" href="/company/grievance-redressal">Grievance redressal</Link><Link className="btn btn-ghost btn-sm" href="/accessibility">Accessibility</Link></div>
          </div>
          {NAV_GROUPS.slice(0, 4).map((g) => (
            <div key={g.key}><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{g.label}</div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">{g.links.map((l) => <li key={l.href}><Link className="hover:text-text" href={l.href}>{l.label}</Link></li>)}</ul></div>
          ))}
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="text-xs text-faint">
            <div className="font-semibold text-muted">Investor charter and protection</div>
            <p className="mt-1">Investments in securities markets are subject to market risks. Read all related documents carefully before investing. Complaints, once the platform is live, can be lodged with the broker&apos;s designated officer and, if unresolved, on the SEBI SCORES portal and the exchange investor grievance mechanism. See <Link className="underline" href="/learn/investor-protection">Investor protection education</Link>.</p>
          </div>
          {NAV_GROUPS.slice(4).map((g) => (
            <div key={g.key}><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{g.label}</div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">{g.links.map((l) => <li key={l.href}><Link className="hover:text-text" href={l.href}>{l.label}</Link></li>)}</ul></div>
          ))}
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-faint">
        © AIRAVAT. Sandbox environment: simulated market data and simulated funds only. <Link className="underline" href="/legal/terms-of-use">Terms</Link> · <Link className="underline" href="/legal/risk-disclosure">Risk disclosure</Link> · <Link className="underline" href="/legal/privacy-policy">Privacy</Link> · <Link className="underline" href="/sitemap.xml">Sitemap</Link>
      </div>
    </footer>
  );
}
