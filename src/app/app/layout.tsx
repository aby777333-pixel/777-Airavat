import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccount, getFunds } from "@/lib/account";
import { getMarketStatus } from "@/lib/market";
import { money } from "@/lib/format";
import { signOut } from "@/app/(auth)/actions";
import { Logo } from "@/components/site/Header";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LiveOrb from "@/components/live/LiveOrb";
import CommandPalette, { CommandButton } from "@/components/CommandPalette";
import { SandboxBanner } from "@/components/ui";
import clsx from "clsx";

export const dynamic = "force-dynamic";

const nav = [
  ["/app", "Dashboard"], ["/app/pro", "Terminal X"], ["/app/markets", "Market watch"], ["/app/orders", "Orders"], ["/app/positions", "Positions"], ["/app/holdings", "Holdings"],
  ["/app/portfolio", "Portfolio"], ["/app/reports", "Reports & tax"], ["/app/funds", "Funds"], ["/app/ledger", "Ledger"],
  ["/app/scanners", "Scanner Matrix"], ["/app/research", "Research cases"], ["/app/strategies", "Strategy DNA"], ["/app/shadow", "Shadow Portfolio"], ["/app/sentinel", "Sentinel X"], ["/app/risk", "My risk & limits"],
  ["/app/ipo", "IPO desk"], ["/app/developer", "API & alerts"], ["/app/plan", "My plan & offers"], ["/app/partner", "Partner portal"], ["/app/kyc", "KYC & account"], ["/app/consents", "Consent vault"], ["/app/support", "Support"], ["/app/notifications", "Notifications"], ["/app/theme", "Theme Studio"], ["/app/settings", "Settings"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, profile } = await requireUser("/app");
  const [account, ms, unread] = await Promise.all([
    getAccount(supabase, user.id), getMarketStatus(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  const funds = account ? await getFunds(supabase, account.id) : null;
  const isStaff = !!profile && ["dealer", "ops", "risk", "compliance", "admin", "super_admin"].includes(profile.role);

  return (
    <div className="bg-atmosphere min-h-dvh">
      <SandboxBanner />
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[250px_1fr]">
        <aside className="glass h-fit p-4 lg:sticky lg:top-5">
          <Link href="/" className="flex items-center gap-2 px-2"><Logo size={32} /></Link>
          <div className="mt-4 rounded-xl border border-border bg-bg/40 p-3 text-xs">
            <div className="truncate font-medium">{profile?.full_name || user.email}</div>
            <div className="text-faint">{account ? `Client ${account.client_code} · ${account.status}` : "No sandbox account yet"}</div>
            {funds && <div className="tnum mt-2 text-sm">Available <strong>{money(funds.available)}</strong></div>}
            <div className="mt-1 text-faint">Session <span className={clsx(ms.status === "OPEN" ? "text-profit" : "text-warn")}>{ms.status}</span>{ms.accepting_orders && ms.status !== "OPEN" ? " · sandbox hours" : ""}</div>
          </div>
          <nav className="mt-4 flex flex-wrap gap-1 lg:flex-col" aria-label="Application">
            {nav.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-accent/10 hover:text-text">
                {label}{href === "/app/notifications" && (unread.count ?? 0) > 0 && <span className="ml-2 badge badge-accent">{unread.count}</span>}
              </Link>
            ))}
            {isStaff && <Link href="/admin" className="rounded-lg px-3 py-2 text-sm text-accent hover:bg-accent/10">Broker Core (admin) →</Link>}
          </nav>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2">
            <ThemeSwitcher compact />
            <CommandButton />
            <form action={signOut}><button className="btn btn-ghost btn-sm">Log out</button></form>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
      <LiveOrb context={{ surface: "client-app" }} />
      <CommandPalette />
    </div>
  );
}
