"use client";
import { useState } from "react";
import clsx from "clsx";

// Indian business television: the official YouTube live streams of the channels, embedded only after the viewer presses play
// (no third-party requests until then). If a channel is not live, YouTube shows its own notice and the link opens the channel.
const CHANNELS = [
  { key: "cnbctv18", name: "CNBC-TV18", lang: "English", id: "UCmRbHAgG2k2vDUvb3xsEunQ" },
  { key: "etnow", name: "ET Now", lang: "English", id: "UCI_mwTKUhicNzFrhm33MzBQ" },
  { key: "ndtvprofit", name: "NDTV Profit", lang: "English", id: "UCZFMm1mMw0F81Z37aaEzTUA" },
  { key: "zeebusiness", name: "Zee Business", lang: "Hindi", id: "UCkXopQ3ubd-rnXnStZqCl2w" },
  { key: "cnbcawaaz", name: "CNBC Awaaz", lang: "Hindi", id: "UCQIycDaLsBpMKjOCeaKUYVg" },
  { key: "businesstoday", name: "Business Today", lang: "English", id: "UCaPHWiExfUWaKsUtENLCv5w" },
];

export default function BusinessTv({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(CHANNELS[0].key);
  const [playing, setPlaying] = useState(false);
  const ch = CHANNELS.find((c) => c.key === active) ?? CHANNELS[0];
  const src = `https://www.youtube-nocookie.com/embed/live_stream?channel=${ch.id}&autoplay=1&rel=0`;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-display text-sm font-semibold">Business TV · live</div>
        <span className="text-[11px] text-faint">Official YouTube streams · third-party content</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">{CHANNELS.map((c) => <button key={c.key} type="button" onClick={() => { setActive(c.key); setPlaying(false); }} className={clsx("badge !normal-case !tracking-normal", active === c.key && "badge-accent")}>{c.name}<span className="ml-1 text-[9px] opacity-70">{c.lang}</span></button>)}</div>
      <div className={clsx("relative mt-3 w-full overflow-hidden rounded-lg border border-border bg-[#0c1116]", compact ? "aspect-video" : "aspect-video min-h-[260px]")}>
        {playing ? (
          <iframe key={ch.key} src={src} title={`${ch.name} live`} className="absolute inset-0 h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-[#eef0f1]" aria-label={`Play ${ch.name} live stream`}>
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/10 text-3xl backdrop-blur">▶</span>
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">{ch.name}</span>
            <span className="px-6 text-center text-xs text-[#a9b2ba]">Press play to load the live stream from YouTube. Nothing is loaded until you do.</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-faint">
        <span>Streams belong to the broadcasters; AIRAVAT does not control or endorse the content. Not investment advice.</span>
        <a href={`https://www.youtube.com/channel/${ch.id}/live`} target="_blank" rel="noreferrer" className="text-accent hover:underline">Open on YouTube ↗</a>
      </div>
    </div>
  );
}
