"use client";
import { useSyncExternalStore } from "react";
import { THEMES } from "@/lib/themes";
export { THEMES };


const listeners = new Set<() => void>();
export function applyTheme(id: string) {
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("airavat-theme-v2", id); } catch {}
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
