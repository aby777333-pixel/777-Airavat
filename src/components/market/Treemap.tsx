"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

export type Tile = { symbol: string; name: string; sector: string; weight: number; chg: number; ltp: number };
type Rect = { x: number; y: number; w: number; h: number };
type Laid = Tile & Rect;

// Squarified treemap (Bruls, Huizing, van Wijk). Pure, deterministic; returns rects in the given box.
function squarify(items: { key: string; value: number }[], box: Rect): Record<string, Rect> {
  const out: Record<string, Rect> = {};
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const scale = (box.w * box.h) / total;
  let rows = items.filter((i) => i.value > 0).map((i) => ({ key: i.key, area: i.value * scale })).sort((a, b) => b.area - a.area);
  let { x, y, w, h } = box;
  const worst = (row: { area: number }[], side: number) => { const s = row.reduce((a, r) => a + r.area, 0); const max = Math.max(...row.map((r) => r.area)); const min = Math.min(...row.map((r) => r.area)); return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min)); };
  while (rows.length) {
    const vertical = w >= h; const side = vertical ? h : w;
    const row: { key: string; area: number }[] = [rows[0]]; let i = 1;
    while (i < rows.length && worst([...row, rows[i]], side) <= worst(row, side)) { row.push(rows[i]); i++; }
    const sum = row.reduce((a, r) => a + r.area, 0); const thick = side ? sum / side : 0;
    let off = 0;
    for (const r of row) { const len = thick ? r.area / thick : 0; out[r.key] = vertical ? { x, y: y + off, w: thick, h: len } : { x: x + off, y, w: len, h: thick }; off += len; }
    if (vertical) { x += thick; w -= thick; } else { y += thick; h -= thick; }
    rows = rows.slice(i);
  }
  return out;
}

const color = (chg: number) => { const c = Math.max(-4, Math.min(4, chg)); const a = Math.min(1, Math.abs(c) / 3) * 0.85 + 0.12; return c >= 0 ? `rgba(63,184,114,${a})` : `rgba(226,74,74,${a})`; };
const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function Treemap({ tiles, width = 1200, height = 640 }: { tiles: Tile[]; width?: number; height?: number }) {
  const [group, setGroup] = useState(true);
  const [size, setSize] = useState<"weight" | "equal">("weight");
  const [hover, setHover] = useState<Laid | null>(null);
  const laid = useMemo<{ tiles: Laid[]; groups: (Rect & { sector: string; chg: number })[] }>(() => {
    const val = (t: Tile) => (size === "weight" ? Math.max(0.05, t.weight) : 1);
    const pad = 3;
    if (!group) {
      const r = squarify(tiles.map((t) => ({ key: t.symbol, value: val(t) })), { x: 0, y: 0, w: width, h: height });
      return { tiles: tiles.filter((t) => r[t.symbol]).map((t) => ({ ...t, ...r[t.symbol] })), groups: [] };
    }
    const sectors = Array.from(new Set(tiles.map((t) => t.sector)));
    const sr = squarify(sectors.map((s) => ({ key: s, value: tiles.filter((t) => t.sector === s).reduce((a, t) => a + val(t), 0) })), { x: 0, y: 0, w: width, h: height });
    const outTiles: Laid[] = []; const groups: (Rect & { sector: string; chg: number })[] = [];
    for (const s of sectors) {
      const box = sr[s]; if (!box) continue;
      const members = tiles.filter((t) => t.sector === s);
      const wsum = members.reduce((a, t) => a + t.weight, 0) || 1;
      groups.push({ ...box, sector: s, chg: members.reduce((a, t) => a + t.chg * t.weight, 0) / wsum });
      const inner = { x: box.x + pad, y: box.y + 18, w: Math.max(0, box.w - pad * 2), h: Math.max(0, box.h - 18 - pad) };
      const r = squarify(members.map((t) => ({ key: t.symbol, value: val(t) })), inner);
      members.forEach((t) => { if (r[t.symbol]) outTiles.push({ ...t, ...r[t.symbol] }); });
    }
    return { tiles: outTiles, groups };
  }, [tiles, group, size, width, height]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setGroup((g) => !g)} className={clsx("badge !normal-case !tracking-normal", group && "badge-accent")}>Group by sector</button>
        <button type="button" onClick={() => setSize((s) => (s === "weight" ? "equal" : "weight"))} className="badge !normal-case !tracking-normal">Size: {size === "weight" ? "index weight" : "equal"}</button>
        <span className="ml-auto flex items-center gap-1 text-muted">−4%<span className="inline-block h-3 w-28 rounded" style={{ background: "linear-gradient(90deg, rgba(226,74,74,.97), rgba(226,74,74,.12), rgba(63,184,114,.12), rgba(63,184,114,.97))" }} />+4%</span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full rounded-xl" role="img" aria-label="Market heatmap">
          {laid.groups.map((g) => (
            <g key={g.sector}><rect x={g.x} y={g.y} width={g.w} height={g.h} fill="rgba(127,127,127,0.08)" stroke="rgba(127,127,127,0.25)" rx={6} />{g.w > 70 && <text x={g.x + 6} y={g.y + 13} fontSize={11} fontWeight={600} fill="currentColor" opacity={0.8}>{g.sector} {g.chg >= 0 ? "+" : ""}{g.chg.toFixed(2)}%</text>}</g>
          ))}
          {laid.tiles.map((t, i) => (
            <Link key={t.symbol} href={`/markets/${encodeURIComponent(t.symbol)}`}>
              <g className="fx-fade" style={{ animationDelay: `${Math.min(i * 18, 900)}ms`, animationFillMode: "both" }} onMouseEnter={() => setHover(t)} onMouseLeave={() => setHover(null)}>
                <rect x={t.x + 1} y={t.y + 1} width={Math.max(0, t.w - 2)} height={Math.max(0, t.h - 2)} fill={color(t.chg)} stroke={hover?.symbol === t.symbol ? "currentColor" : "rgba(0,0,0,0.25)"} rx={4} />
                {t.w > 48 && t.h > 26 && <text x={t.x + t.w / 2} y={t.y + t.h / 2 - (t.h > 44 ? 4 : -4)} textAnchor="middle" fontSize={Math.max(9, Math.min(16, t.w / 7))} fontWeight={700} fill="#fff" style={{ textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{t.symbol}</text>}
                {t.w > 48 && t.h > 44 && <text x={t.x + t.w / 2} y={t.y + t.h / 2 + 12} textAnchor="middle" fontSize={Math.max(9, Math.min(13, t.w / 9))} fill="#fff" style={{ textShadow: "0 1px 2px rgba(0,0,0,.6)" }}>{t.chg >= 0 ? "+" : ""}{t.chg.toFixed(2)}%</text>}
              </g>
            </Link>
          ))}
        </svg>
        {hover && <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-border bg-surface/95 p-3 text-xs shadow-lg"><div className="font-semibold">{hover.symbol} <span className="font-normal text-muted">{hover.name}</span></div><div className="text-muted">{hover.sector} · weight {hover.weight.toFixed(2)}%</div><div className={clsx("tnum font-semibold", hover.chg >= 0 ? "text-profit" : "text-loss")}>₹{fmt(hover.ltp)} · {hover.chg >= 0 ? "+" : ""}{hover.chg.toFixed(2)}%</div></div>}
      </div>
    </div>
  );
}
