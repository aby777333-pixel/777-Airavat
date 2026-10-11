// Browser-only watchlist and alerts for visitors without an account. Stored in localStorage; migrated to the account on sign-in.
export type LocalAlert = { id: string; symbol: string; condition: "ABOVE" | "BELOW"; price: number; createdAt: string; triggeredAt?: string };
const WL_KEY = "airavat-public-watchlist";
const AL_KEY = "airavat-public-alerts";
const EVT = "airavat:watchlist";

function read<T>(key: string, fallback: T): T { try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent(EVT)); } catch { /* storage unavailable */ } }

export const watchlist = {
  get: () => read<string[]>(WL_KEY, []),
  has: (symbol: string) => watchlist.get().includes(symbol.toUpperCase()),
  toggle: (symbol: string) => { const s = symbol.toUpperCase(); const cur = watchlist.get(); const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s].slice(0, 60); write(WL_KEY, next); return next.includes(s); },
  set: (symbols: string[]) => write(WL_KEY, Array.from(new Set(symbols.map((s) => s.toUpperCase()))).slice(0, 60)),
  clear: () => { write(WL_KEY, []); write(AL_KEY, []); },
};
export const alerts = {
  get: () => read<LocalAlert[]>(AL_KEY, []),
  add: (symbol: string, condition: "ABOVE" | "BELOW", price: number) => { const a: LocalAlert = { id: Math.random().toString(36).slice(2, 10), symbol: symbol.toUpperCase(), condition, price, createdAt: new Date().toISOString() }; write(AL_KEY, [...alerts.get(), a].slice(-50)); return a; },
  remove: (id: string) => write(AL_KEY, alerts.get().filter((a) => a.id !== id)),
  markTriggered: (id: string) => write(AL_KEY, alerts.get().map((a) => (a.id === id ? { ...a, triggeredAt: new Date().toISOString() } : a))),
};
export const WATCHLIST_EVENT = EVT;
