import Link from "next/link";
import { getSession } from "@/lib/auth";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { SandboxBanner } from "@/components/ui";
import MobileNav from "./MobileNav";
import MegaMenu from "./MegaMenu";
import { CommandButton } from "@/components/CommandPalette";
import { NAV_GROUPS, UTILITY_NAV } from "@/lib/navigation";
import { publishedMenu } from "@/lib/cms";

// Legacy flat list kept for the command registry and tests; the header renders NAV_GROUPS.
export const NAV = NAV_GROUPS.map((g) => ({ href: g.links[0].href, label: g.label }));

export default async function Header() {
  const [{ user, profile }, menuOverride] = await Promise.all([getSession(), publishedMenu("primary")]);
  const groups = menuOverride ?? NAV_GROUPS;
  return (
    <>
      <SandboxBanner />
      <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto hidden h-7 max-w-7xl items-center justify-end gap-4 px-4 text-[11px] text-faint sm:px-6 lg:flex" aria-label="Utility">
          {UTILITY_NAV.map((u) => <Link key={u.href} href={u.href} className="hover:text-text">{u.label}</Link>)}
          <span aria-hidden="true">·</span><span>English · हिन्दी via BHASHA</span>
        </div>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="AIRAVAT home">
            <Logo />
            <span className="font-display text-lg font-bold tracking-[0.18em]">AIRAVAT</span>
          </Link>
          <nav aria-label="Primary"><MegaMenu groups={groups} /></nav>
          <div className="hidden items-center gap-2 lg:flex">
            <CommandButton />
            <ThemeSwitcher compact />
            {user ? (
              <>
                {profile && ["dealer", "ops", "risk", "compliance", "admin", "super_admin"].includes(profile.role) && (
                  <Link href="/admin" className="btn btn-ghost btn-sm">Admin</Link>
                )}
                <Link href="/app" className="btn btn-primary btn-sm">Open terminal</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link href="/signup" className="btn btn-primary btn-sm">Open account</Link>
              </>
            )}
          </div>
          <MobileNav groups={groups} utility={UTILITY_NAV} signedIn={!!user} />
        </div>
      </header>
    </>
  );
}

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" stroke="url(#g)" strokeWidth="2" opacity="0.6" />
      <path d="M18 42c0-10 6-18 14-18s14 8 14 18" stroke="url(#g)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M26 42v-8m12 8v-8" stroke="url(#g)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M32 24c0-4 3-7 7-7" stroke="url(#g)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="30" r="1.8" fill="var(--accent)" />
    </svg>
  );
}
