import type { ReactNode } from "react";
import type { HeroVariant } from "@/lib/seo";
import HeroFx from "./HeroFx";

// Page-specific cinematic hero band: a unique animated backdrop per page (CSS/SVG only, reduced-motion aware),
// keyword-rich intro copy for search engines, and the page header inside it.
export default function PageHero({ variant, intro, children }: { variant: HeroVariant; intro?: string; children: ReactNode }) {
  return (
    <div className={`hero hero-${variant} relative mb-8 overflow-hidden rounded-[var(--radius-lg)] px-5 pt-10 sm:px-8`}>
      <HeroFx variant={variant} />
      <div className="relative">
        {children}
        {intro && <p className="-mt-4 mb-6 max-w-3xl text-sm leading-relaxed text-muted">{intro}</p>}
      </div>
    </div>
  );
}
