import Link from "next/link";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import LiveLink from "@/components/live/LiveLink";
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
      <header className="on-night sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto hidden h-7 max-w-[1400px] items-center justify-end gap-4 px-4 text-[11px] text-faint sm:px-6 lg:flex" aria-label="Utility">
          {UTILITY_NAV.map((u) => <Link key={u.href} href={u.href} className="hover:text-text">{u.label}</Link>)}
          <span aria-hidden="true">·</span><LiveLink /><span aria-hidden="true">·</span><span>English · हिन्दी via BHASHA</span>
        </div>
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="AIRAVAT home">
            <Logo size={42} />
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

export function Logo({ size = 34, lockup = true }: { size?: number; lockup?: boolean }) {
  const light = (lockup ? "/brand/airavat-logo.png" : "/brand/airavat-mark.png") + "?v=3";
  const dark = (lockup ? "/brand/airavat-logo-dark.png" : "/brand/airavat-mark-dark.png") + "?v=3";
  const ratio = lockup ? 1000 / 292 : 480 / 311;
  const w = Math.round(size * ratio);
  return (
    <span className="logo inline-flex shrink-0 items-center" style={{ height: size, width: w }}>
      <Image src={light} alt="AIRAVAT" width={w} height={size} className="logo-light h-full w-auto" priority unoptimized />
      <Image src={dark} alt="AIRAVAT" width={w} height={size} className="logo-dark h-full w-auto" priority unoptimized />
    </span>
  );
}
