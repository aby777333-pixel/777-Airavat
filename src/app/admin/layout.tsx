import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getMarketStatus } from "@/lib/market";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/site/Header";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { Badge, SandboxBanner } from "@/components/ui";
import CommandPalette, { CommandButton } from "@/components/CommandPalette";

export const dynamic = "force-dynamic";

const nav = [
  ["/admin", "Control tower"], ["/admin/clients", "Clients & roles"], ["/admin/kyc", "KYC queue"], ["/admin/orders", "Orders"], ["/admin/trades", "Trades"],
  ["/admin/funds", "Funds & payouts"], ["/admin/ledger", "Ledger & reconciliation"], ["/admin/risk", "Risk limits"], ["/admin/settlement", "Settlement"],
  ["/admin/revenue", "RevenueOS"], ["/admin/approvals", "Approvals"], ["/admin/partners", "Partners & CRM"], ["/admin/editorial", "Editorial (DAILY)"], ["/admin/website", "Website CMS"], ["/admin/markets", "Market matrix"], ["/admin/market-data", "Market data"], ["/admin/sentinel", "Sentinel overview"],
  ["/admin/support", "Support desk"], ["/admin/audit", "Audit log"], ["/admin/ai", "AI operations"], ["/admin/regulatory", "Regulatory register"], ["/admin/requirements", "Requirements register"], ["/admin/settings", "System settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireStaff("/admin");
  const ms = await getMarketStatus();
  return (
    <div className="bg-atmosphere min-h-dvh" data-density="compact">
      <SandboxBanner />
      <div className="mx-auto grid max-w-[1700px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="glass h-fit p-4 lg:sticky lg:top-5">
          <Link href="/" className="flex items-center gap-2 px-2"><Logo size={28} /><span className="font-display text-sm font-bold tracking-[0.18em]">BROKER CORE</span></Link>
          <div className="mt-4 rounded-xl border border-border bg-bg/40 p-3 text-xs">
            <div className="truncate font-medium">{profile?.full_name || user.email}</div>
            <div className="mt-1 flex items-center gap-2"><Badge tone="accent">{profile?.role}</Badge><Badge tone={ms.status === "OPEN" ? "ok" : "info"}>{ms.status}</Badge></div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-1 lg:flex-col" aria-label="Admin">
            {nav.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-accent/10 hover:text-text">{label}</Link>)}
            <Link href="/app" className="rounded-lg px-3 py-1.5 text-sm text-accent hover:bg-accent/10">← Client app</Link>
          </nav>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2"><ThemeSwitcher compact /><CommandButton /><form action={signOut}><button className="btn btn-ghost btn-sm">Log out</button></form></div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
