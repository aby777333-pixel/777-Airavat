"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { ShowroomItem } from "@/lib/showroom";
import { Badge } from "@/components/ui";

// Zoomable, pannable, keyboard-navigable lightbox for authentic screenshots.
export default function Gallery({ items }: { items: ShowroomItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const withImage = items.filter((i) => i.src);

  const close = useCallback(() => { setOpen(null); setZoom(1); setPan({ x: 0, y: 0 }); lastFocus.current?.focus(); }, []);
  const show = (i: number, el?: HTMLElement) => { lastFocus.current = el ?? null; setOpen(i); setZoom(1); setPan({ x: 0, y: 0 }); };
  // Lock page scroll while the lightbox is open (external DOM sync).
  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % withImage.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + withImage.length) % withImage.length));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.25));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.25));
      if (e.key === "0") { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, withImage.length, close]);

  const cur = open !== null ? withImage[open] : null;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <figure key={it.id} className={clsx("m-crystal overflow-hidden", it.pending && "opacity-80")}>
            {it.src ? (
              <button className="block w-full text-left" onClick={(e) => show(withImage.findIndex((w) => w.id === it.id), e.currentTarget)} aria-label={`Open ${it.title}`}>
                <div className={clsx("overflow-hidden bg-black/30", it.device === "mobile" ? "flex justify-center p-3" : "")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.src} alt={`${it.module}: ${it.title}`} loading="lazy" className={clsx("transition hover:scale-[1.02]", it.device === "mobile" ? "h-72 w-auto rounded-xl" : "aspect-video w-full object-cover object-top")} />
                </div>
              </button>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black/20 text-sm text-muted">Pending capture</div>
            )}
            <figcaption className="p-4">
              <div className="flex items-center gap-2 text-xs"><Badge tone="accent">{it.module}</Badge><Badge>{it.device}</Badge>{it.pending && <Badge tone="bad">pending</Badge>}</div>
              <div className="font-display mt-1 font-semibold">{it.title}</div>
              <p className="mt-1 text-xs text-muted">{it.pending ?? it.caption}</p>
              {it.capturedAt && <div className="mt-1 text-[11px] text-faint">Captured {it.capturedAt}</div>}
            </figcaption>
          </figure>
        ))}
      </div>
      {cur && (
        <div role="dialog" aria-modal="true" aria-label={cur.title} className="fixed inset-0 z-[80] flex flex-col bg-black/90" onClick={close}>
          <div className="flex items-center justify-between gap-2 p-3 text-sm text-white" onClick={(e) => e.stopPropagation()}>
            <div><strong>{cur.title}</strong> <span className="text-white/60">· {cur.module} · {open! + 1}/{withImage.length}</span></div>
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out">−</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Fit to screen">Fit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.25))} aria-label="Zoom in">+</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => (o! - 1 + withImage.length) % withImage.length)} aria-label="Previous">‹</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => (o! + 1) % withImage.length)} aria-label="Next">›</button>
              <button className="btn btn-primary btn-sm" onClick={close} aria-label="Close">✕ Close</button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(4, Math.max(1, z - Math.sign(e.deltaY) * 0.15))); }}
            onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }}
            onPointerMove={(e) => { if (drag.current && zoom > 1) setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); }}
            onPointerUp={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cur.src} alt={cur.title} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in" }} onClick={() => zoom === 1 && setZoom(2)} className="max-h-[80vh] max-w-[95vw] select-none object-contain transition-transform" />
          </div>
          <div className="p-3 text-center text-xs text-white/70" onClick={(e) => e.stopPropagation()}>{cur.caption} · Keys: ← → navigate, + − zoom, 0 fit, Esc close</div>
        </div>
      )}
    </>
  );
}
