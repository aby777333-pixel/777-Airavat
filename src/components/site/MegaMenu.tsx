"use client";
import Link from "next/link";
import HeroFx from "./HeroFx";
import type { HeroVariant } from "@/lib/seo";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { NavGroup } from "@/lib/navigation";

const badgeText: Record<string, string> = { sandbox: "sandbox", soon: "coming", research: "research-only", new: "new" };

// Accessible mega menu: buttons toggle panels, Escape closes, focus/blur management, hover-intent on desktop.
// One distinct animation per menu group inside the featured card (CSS/SVG only, reduced-motion aware).
const FEATURED_FX: Record<string, HeroVariant> = { invest: "briefing", trade: "markets", markets: "universe", intelligence: "research", tools: "calculators", learn: "academy", pricing: "pricing", company: "about" };

export default function MegaMenu({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null); };
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);
  const enter = (k: string) => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(k), 120); };
  const leave = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(null), 220); };
  return (
    <div ref={ref} className="relative hidden items-center gap-0.5 lg:flex" onMouseLeave={leave}>
      {groups.map((g) => (
        <div key={g.key} onMouseEnter={() => enter(g.key)}>
          <button type="button" className={clsx("rounded-full px-3 py-1.5 text-sm transition", open === g.key ? "bg-accent/15 text-text" : "text-muted hover:text-text")} aria-expanded={open === g.key} aria-controls={`menu-${g.key}`} onClick={() => setOpen((o) => (o === g.key ? null : g.key))}>
            {g.label}<span aria-hidden="true" className="ml-1 text-[10px] opacity-60">▾</span>
          </button>
        </div>
      ))}
      {groups.map((g) => open === g.key && (
        <div key={g.key} id={`menu-${g.key}`} role="region" aria-label={`${g.label} menu`} className="menu-panel absolute left-1/2 top-full z-50 mt-2 w-[min(960px,92vw)] -translate-x-1/2 p-5" onMouseEnter={() => enter(g.key)}>
          <div className="grid gap-5 md:grid-cols-[1.618fr_1fr]">
            <div>
              <div className="mb-3 text-xs text-muted">{g.blurb}</div>
              <ul className="grid gap-1 sm:grid-cols-2">
                {g.links.map((l) => (
                  <li key={l.href}><Link href={l.href} onClick={() => setOpen(null)} className="group flex items-start gap-3 rounded-xl p-2 transition hover:bg-accent/10">
                    <span aria-hidden="true" className="mt-0.5 w-6 text-center text-base">{l.icon ?? "•"}</span>
                    <span><span className="flex items-center gap-2 text-sm font-medium group-hover:text-accent">{l.label}{l.badge && <span className={clsx("badge !text-[10px]", l.badge === "sandbox" ? "badge-sim" : "")}>{badgeText[l.badge]}</span>}</span>{l.desc && <span className="block text-xs text-muted">{l.desc}</span>}</span>
                  </Link></li>
                ))}
              </ul>
            </div>
            {g.featured && (
              <Link href={g.featured.href} onClick={() => setOpen(null)} className="m-crystal relative flex min-h-[220px] flex-col justify-end overflow-hidden p-5"><HeroFx variant={FEATURED_FX[g.key] ?? "platforms"} /><div className="relative">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Featured</div>
                <div className="font-display mt-2 text-lg font-semibold">{g.featured.title}</div>
                <p className="mt-1 text-sm text-muted">{g.featured.body}</p>
                <span className="mt-3 text-xs text-accent">Open →</span>
              </div></Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
