"use client";
import Link from "next/link";
import { useState } from "react";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type { NavGroup } from "@/lib/navigation";
import HeroFx from "./HeroFx";
import { FEATURED_FX } from "./MegaMenu";

export default function MobileNav({ groups, utility, signedIn }: { groups: NavGroup[]; utility: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [sec, setSec] = useState<string | null>(null);
  return (
    <div className="lg:hidden">
      <button className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-[4.75rem] max-h-[80vh] overflow-y-auto border-b border-border bg-bg/95 p-4 backdrop-blur-xl">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {groups.map((g) => (
              <div key={g.key} className="border-b border-border/60 py-1">
                <button type="button" className="flex w-full items-center justify-between py-2 text-base font-medium" aria-expanded={sec === g.key} onClick={() => setSec((s) => (s === g.key ? null : g.key))}>{g.label}<span aria-hidden="true">{sec === g.key ? "−" : "+"}</span></button>
                {sec === g.key && (
                  <div className="mb-2">
                    {g.featured && (
                      <Link href={g.featured.href} onClick={() => setOpen(false)} className="m-crystal relative mb-2 block min-h-[140px] overflow-hidden p-4">
                        <HeroFx variant={FEATURED_FX[g.key] ?? "platforms"} />
                        <div className="relative flex h-full flex-col justify-end pt-14"><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Featured</div><div className="font-display text-base font-semibold">{g.featured.title}</div><p className="text-xs text-muted">{g.featured.body}</p></div>
                      </Link>
                    )}
                    <ul className="grid gap-1 pl-2">{g.links.map((l) => <li key={l.href}><Link href={l.href} onClick={() => setOpen(false)} className="block py-1.5 text-sm text-muted hover:text-text"><span aria-hidden="true" className="mr-2">{l.icon}</span>{l.label}</Link></li>)}</ul>
                  </div>
                )}
              </div>
            ))}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">{utility.map((u) => <Link key={u.href} href={u.href} onClick={() => setOpen(false)}>{u.label}</Link>)}</div>
            <div className="mt-3 flex items-center gap-3">
              {signedIn ? <Link href="/app" className="btn btn-primary btn-sm">Open terminal</Link> : (<><Link href="/login" className="btn btn-ghost btn-sm">Log in</Link><Link href="/signup" className="btn btn-primary btn-sm">Open account</Link></>)}
            </div>
            <ThemeSwitcher />
          </nav>
        </div>
      )}
    </div>
  );
}
