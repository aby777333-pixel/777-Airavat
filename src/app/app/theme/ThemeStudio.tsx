"use client";
import clsx from "clsx";
import { THEMES, applyPref, applyTheme, usePref, useTheme } from "@/components/ThemeSwitcher";
import { saveThemePrefs } from "../intel/actions";

const MATERIALS: [string, string, string][] = [
  ["m-crystal", "Crystal glass", "Layered, refractive, premium surfaces"], ["m-frost", "Frosted glass", "Soft blur for overlays and forms"], ["m-chrome", "Chrome", "Mirror metal for hero accents"],
  ["m-carbon", "Carbon fibre", "Woven dark texture for technical panels"], ["m-titanium", "Brushed titanium", "Satin metal for controls"], ["m-ceramic", "Ceramic", "Matte white for long reading"],
  ["m-acrylic", "Smoked acrylic", "Translucent dark panels"], ["m-sapphire-edge", "Sapphire edge-lit", "Glowing edge for live and selected states"], ["m-obsidian", "Obsidian", "Deep black for terminals"],
  ["m-dichroic", "Dichroic", "Shifting gradient border for AI surfaces"], ["m-polycarb", "Polycarbonate", "Lightweight clear panels"], ["m-champagne", "Champagne gold", "Restrained premium pills"],
];

export default function ThemeStudio({ savedTheme }: { savedTheme: string }) {
  const theme = useTheme();
  const material = usePref("material", "balanced");
  const motion = usePref("motion", "full");
  const density = usePref("density", "comfortable");
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Palettes</h2><form action={saveThemePrefs}><input type="hidden" name="theme" value={theme} /><button className="btn btn-ghost btn-sm" disabled={theme === savedTheme}>{theme === savedTheme ? "Saved to profile" : "Save to profile"}</button></form></div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {THEMES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyTheme(t.id)} className={clsx("rounded-xl border p-3 text-left transition", theme === t.id ? "border-accent ring-2 ring-accent/40" : "border-border hover:border-border-strong")}>
              <div data-theme={t.id} className="flex gap-1 rounded-lg p-1" style={{ background: "var(--bg)" }}><span className="h-5 w-5 rounded-full" style={{ background: "var(--accent)" }} /><span className="h-5 w-5 rounded-full" style={{ background: "var(--surface-solid)" }} /><span className="h-5 w-5 rounded-full" style={{ background: "var(--text)" }} /><span className="h-5 w-5 rounded-full" style={{ background: "var(--accent-2)" }} /></div>
              <div className="mt-2 text-sm font-medium">{t.name}</div><div className="text-xs text-muted">{t.family}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass p-4"><div className="label">Material mode</div><div className="mt-2 flex gap-1">{["essential", "balanced", "cinematic"].map((m) => <button key={m} type="button" className={clsx("btn btn-sm", material === m ? "btn-primary" : "btn-ghost")} onClick={() => applyPref("material", m)}>{m}</button>)}</div><p className="mt-2 text-xs text-muted">Essential removes blur and reflections for low-end devices.</p></div>
        <div className="glass p-4"><div className="label">Motion</div><div className="mt-2 flex gap-1">{["full", "reduced"].map((m) => <button key={m} type="button" className={clsx("btn btn-sm", motion === m ? "btn-primary" : "btn-ghost")} onClick={() => applyPref("motion", m)}>{m}</button>)}</div><p className="mt-2 text-xs text-muted">Reduced disables animations and the intro; the system reduced-motion setting is always honoured.</p></div>
        <div className="glass p-4"><div className="label">Density</div><div className="mt-2 flex gap-1">{["comfortable", "compact"].map((m) => <button key={m} type="button" className={clsx("btn btn-sm", density === m ? "btn-primary" : "btn-ghost")} onClick={() => applyPref("density", m)}>{m}</button>)}</div><p className="mt-2 text-xs text-muted">Compact tightens tables and cards for trading screens.</p></div>
      </section>
      <section>
        <h2 className="font-display mb-2 text-lg font-semibold">Material library</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MATERIALS.map(([cls, name, use]) => <div key={cls} className={clsx(cls, "p-4")}><div className="text-sm font-semibold">{name}</div><div className="text-xs opacity-80">{use}</div><div className="mt-2 flex gap-2 text-xs"><span className="text-profit">+1.24%</span><span className="text-loss">−0.86%</span></div></div>)}</div>
      </section>
    </div>
  );
}
