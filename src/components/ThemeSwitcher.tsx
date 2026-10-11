"use client";
import { useSyncExternalStore } from "react";

export const THEMES = [
  { id: "midnight-sovereign", name: "Midnight Sovereign", family: "signature" },
  { id: "royal-sapphire", name: "Royal Sapphire", family: "signature" },
  { id: "ivory-reserve", name: "Ivory Reserve", family: "light" },
  { id: "arctic-frost", name: "Arctic Frost", family: "light" },
  { id: "champagne-ivory", name: "Champagne Ivory", family: "light" },
  { id: "obsidian-terminal", name: "Obsidian Terminal", family: "terminal" },
  { id: "obsidian-chrome", name: "Obsidian Chrome", family: "terminal" },
  { id: "graphite-carbon", name: "Graphite Carbon", family: "terminal" },
  { id: "electric-cobalt", name: "Electric Cobalt", family: "terminal" },
  { id: "emerald-exchange", name: "Emerald Exchange", family: "research" },
  { id: "emerald-titanium", name: "Emerald Titanium", family: "research" },
  { id: "midnight-aurora", name: "Midnight Aurora", family: "research" },
  { id: "imperial-burgundy", name: "Imperial Burgundy", family: "editorial" },
  { id: "copper-nebula", name: "Copper Nebula", family: "markets" },
  { id: "high-contrast", name: "High Contrast", family: "accessible" },
];

const listeners = new Set<() => void>();
export function applyTheme(id: string) {
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("airavat-theme", id); } catch {}
  listeners.forEach((l) => l());
}
export function applyPref(key: "material" | "motion" | "density", value: string) {
  document.documentElement.setAttribute(`data-${key}`, value);
  try { localStorage.setItem(`airavat-${key}`, value); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return document.documentElement.getAttribute("data-theme") || "midnight-sovereign"; }
function getServerSnapshot() { return "midnight-sovereign"; }
export function useTheme() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot); }
export function usePref(key: "material" | "motion" | "density", fallback: string) {
  return useSyncExternalStore(subscribe, () => document.documentElement.getAttribute(`data-${key}`) || fallback, () => fallback);
}

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      {!compact && <span>Theme</span>}
      <select aria-label="Theme" className="select !w-auto !py-1 !text-xs" value={theme} onChange={(e) => applyTheme(e.target.value)}>
        {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
}
