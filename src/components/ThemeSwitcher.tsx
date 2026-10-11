"use client";
import { useSyncExternalStore } from "react";

export const THEMES = [
  { id: "midnight-sovereign", name: "Midnight Sovereign" },
  { id: "ivory-reserve", name: "Ivory Reserve" },
  { id: "obsidian-terminal", name: "Obsidian Terminal" },
  { id: "emerald-exchange", name: "Emerald Exchange" },
  { id: "high-contrast", name: "High Contrast" },
];

const listeners = new Set<() => void>();
export function applyTheme(id: string) {
  document.documentElement.setAttribute("data-theme", id);
  try { localStorage.setItem("airavat-theme", id); } catch {}
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot() { return document.documentElement.getAttribute("data-theme") || "midnight-sovereign"; }
function getServerSnapshot() { return "midnight-sovereign"; }

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted">
      {!compact && <span>Theme</span>}
      <select aria-label="Theme" className="select !w-auto !py-1 !text-xs" value={theme} onChange={(e) => applyTheme(e.target.value)}>
        {THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </label>
  );
}
