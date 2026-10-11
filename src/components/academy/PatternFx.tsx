import type { Candle, ChartPattern } from "@/lib/chart-school";

// Animated SVG illustrations for Chart School: candles grow in sequence, pattern lines draw themselves,
// annotations fade in. CSS keyframes live in materialverse.css and respect prefers-reduced-motion.
export function CandleFx({ lead, body, large = false }: { lead: Candle[]; body: Candle[]; large?: boolean }) {
  const all = [...lead.map((c) => ({ ...c, lead: true })), ...body.map((c) => ({ ...c, lead: false }))];
  const w = 320; const h = large ? 220 : 160; const n = all.length; const slot = w / (n + 1); const cw = Math.min(22, slot * 0.6);
  const lo = Math.min(...all.map((c) => c.l)) - 4; const hi = Math.max(...all.map((c) => c.h)) + 4;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * (h - 20) - 10;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" aria-hidden="true">
      <defs><linearGradient id="cs-grid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.08" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs>
      <rect x="0" y="0" width={w} height={h} fill="url(#cs-grid)" />
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--border)" strokeDasharray="3 5" />)}
      {all.map((c, i) => { const x = slot * (i + 1); const up = c.c >= c.o; const top = y(Math.max(c.o, c.c)); const bot = y(Math.min(c.o, c.c)); const color = c.lead ? "var(--text-faint)" : up ? "var(--profit)" : "var(--loss)"; return (
        <g key={i} className="fx-candle" style={{ animationDelay: `${i * 220}ms`, transformOrigin: `${x}px ${y(c.l)}px`, transformBox: "view-box" as never }} opacity={c.lead ? 0.45 : 1}>
          <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1.5" />
          <rect x={x - cw / 2} y={top} width={cw} height={Math.max(2, bot - top)} fill={up ? color : color} stroke={color} rx="1.5" />
        </g>); })}
      {body.length > 0 && <rect className="fx-fade" style={{ animationDelay: `${all.length * 220 + 200}ms` }} x={slot * (lead.length + 1) - cw} y={6} width={slot * body.length + cw} height={h - 12} fill="none" stroke="var(--accent)" strokeDasharray="4 4" rx="6" />}
    </svg>
  );
}

export function ChartFx({ pattern, large = false }: { pattern: ChartPattern; large?: boolean }) {
  const w = 320; const h = large ? 220 : 160; const pad = 12;
  const x = (v: number) => pad + (v / 80) * (w - pad * 2); const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const d = pattern.points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${x(px).toFixed(1)},${y(py).toFixed(1)}`).join(" ");
  const col = pattern.bias === "bearish" ? "var(--loss)" : pattern.bias === "bullish" ? "var(--profit)" : "var(--accent)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" aria-hidden="true">
      {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--border)" strokeDasharray="3 5" />)}
      <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="fx-draw" />
      {(pattern.lines ?? []).map((l, i) => <line key={i} className="fx-fade" style={{ animationDelay: `${1400 + i * 300}ms` }} x1={x(l[0])} y1={y(l[1])} x2={x(l[2])} y2={y(l[3])} stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="6 4" />)}
      {pattern.points.map(([px, py], i) => <circle key={i} className="fx-fade" style={{ animationDelay: `${300 + i * 200}ms` }} cx={x(px)} cy={y(py)} r="2.5" fill={col} />)}
      <circle className="fx-ring" cx={x(pattern.points[pattern.points.length - 1][0])} cy={y(pattern.points[pattern.points.length - 1][1])} r="8" fill="none" stroke={col} strokeWidth="1.5" />
    </svg>
  );
}
