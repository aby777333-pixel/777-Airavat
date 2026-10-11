import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";

export const metadata = { ...metadataFor("/platforms/mobile") };

const INSTALL = [
  { os: "Android (Chrome)", steps: ["Open 777-airavat.netlify.app in Chrome", "Tap the three-dot menu, then 'Install app' or 'Add to Home screen'", "Confirm; AIRAVAT appears on the home screen and opens full-screen"] },
  { os: "iPhone and iPad (Safari)", steps: ["Open the site in Safari", "Tap Share, then 'Add to Home Screen'", "Tap Add; the icon uses the AIRAVAT elephant mark"] },
  { os: "Windows and macOS (Chrome, Edge)", steps: ["Open the site", "Click the install icon at the right of the address bar, or the browser menu, then 'Install AIRAVAT'", "It opens in its own window with the market watch shortcut"] },
];
const FEATURES = [
  ["Market watch and quotes", "Simulated quotes refresh every two seconds while the app is open"],
  ["Orders and order passport", "Place, modify and cancel sandbox orders; every RMS check is visible"],
  ["Holdings, positions, funds", "Same ledger as the web app; nothing is cached on the device"],
  ["Charts", "Daily and one-minute synthetic candles with indicators and drawings"],
  ["Price alerts", "Alerts evaluate on the server; delivery is in-app (push notifications are planned)"],
  ["AIRAVAT LIVE", "The AI assistant explains your screen; it has no order tools"],
];

export default function MobilePage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/platforms", label: "Platforms" }, { href: "/platforms/mobile", label: "Mobile" }]} />
      <PageHero variant="platforms" intro={seoFor("/platforms/mobile").intro}><PageHeader eyebrow="AIRAVAT Mobile" title="Install AIRAVAT on your phone" subtitle={<>The web app installs as a progressive web app today <Badge tone="ok">PWA live</Badge> <Badge tone="info">Native apps planned</Badge></>} /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-3">{INSTALL.map((i) => <div key={i.os} className="glass p-5"><div className="font-display font-semibold">{i.os}</div><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">{i.steps.map((s) => <li key={s}>{s}</li>)}</ol></div>)}</section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">What works in the installed app</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2">{FEATURES.map(([k, v]) => <div key={k}><dt className="text-sm font-semibold">{k}</dt><dd className="text-sm text-muted">{v}</dd></div>)}</dl></section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Offline and caching, honestly</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Only the static public shell (logo, fonts, offline page) is cached on the device.</li><li>Nothing under the app, admin, auth, login, signup, markets or API paths is ever cached: quotes, orders, holdings and funds are always fetched fresh.</li><li>If you lose connectivity you see an offline page; no stale balances are shown as if they were current.</li><li>Sign-out clears the session; the service worker holds no personal data.</li></ul></section>
          <section className="glass p-5"><h2 className="font-display text-lg font-semibold">Native apps: what is planned</h2><p className="mt-2 text-sm text-muted">Android and iOS native applications with biometric unlock, push alerts and widgets are on the roadmap after the PWA. They will use the same API and the same risk engine; no feature will exist in the app that is not auditable on the server. No store listing exists yet.</p></section>
        </div>
        <aside className="space-y-4">
          <div className="m-crystal p-5"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Try it</div><div className="mt-3 flex flex-col gap-2"><Link href="/login?next=/app" className="btn btn-primary">Open the web app</Link><Link href="/platforms/terminal-demo" className="btn btn-ghost">Public terminal demo</Link><Link href="/trust" className="btn btn-ghost">Security model</Link></div></div>
          <div className="glass p-5"><div className="font-display font-semibold">Security on a shared phone</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>Use device lock; sessions expire and can be revoked from settings</li><li>Never share OTPs; AIRAVAT never asks for them on a call</li><li>Push alerts, when they arrive, will never contain balances</li></ul></div>
          <Notice tone="info">Sandbox: all market data and money in the app are simulated.</Notice>
        </aside>
      </div>
    </div>
  );
}
