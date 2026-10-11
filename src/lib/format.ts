// Indian numbering conventions (lakh / crore grouping) and money formatting.

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function money(v: number | string | null | undefined, opts: { compact?: boolean; decimals?: boolean } = {}) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  if (opts.compact) return compactInr(n);
  return opts.decimals === false ? inr0.format(n) : inr.format(n);
}

export function compactInr(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`;
  return inr.format(n);
}

export function price(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? num.format(n) : "—";
}

export function integer(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? int.format(n) : "—";
}

export function pct(v: number | string | null | undefined, digits = 2) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function signed(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  return `${n > 0 ? "+" : ""}${inr.format(n)}`;
}

export function istTime(iso: string | Date | null | undefined, withDate = true) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...(withDate ? { day: "2-digit", month: "short", year: "numeric" } : {}),
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(d) + " IST";
}

export function changeOf(ltp: number | string, prevClose: number | string) {
  const l = Number(ltp), p = Number(prevClose);
  const change = l - p;
  const changePct = p ? (change / p) * 100 : 0;
  return { change, changePct };
}

export function pnlClass(n: number) {
  return n > 0 ? "text-profit" : n < 0 ? "text-loss" : "text-muted";
}
