"use client";
import Link from "next/link";
import { useState } from "react";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function MobileNav({ nav, signedIn }: { nav: { href: string; label: string }[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button className="btn btn-ghost btn-sm" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>
        {open ? "Close" : "Menu"}
      </button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-16 border-b border-border bg-bg/95 p-4 backdrop-blur-xl">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {nav.map((n) => <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-base">{n.label}</Link>)}
            <div className="mt-2 flex items-center gap-3">
              {signedIn ? <Link href="/app" className="btn btn-primary btn-sm">Open terminal</Link> : (
                <>
                  <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
                  <Link href="/signup" className="btn btn-primary btn-sm">Open account</Link>
                </>
              )}
            </div>
            <ThemeSwitcher />
          </nav>
        </div>
      )}
    </div>
  );
}
