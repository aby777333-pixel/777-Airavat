"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { GLOSSARY, type Term } from "@/lib/glossary";

const CATS = ["All", ...Array.from(new Set(GLOSSARY.map((t) => t.cat)))] as const;

export default function GlossaryList() {
  const [qtext, setQ] = useState(""); const [cat, setCat] = useState<string>("All");
  const rows = useMemo(() => GLOSSARY.filter((t) => (cat === "All" || t.cat === cat) && (qtext.trim() === "" || (t.term + " " + t.def).toLowerCase().includes(qtext.toLowerCase()))).sort((a, b) => a.term.localeCompare(b.term)), [qtext, cat]);
  const letters = Array.from(new Set(rows.map((t) => t.term[0].toUpperCase())));
  const grouped = letters.map((l) => [l, rows.filter((t) => t.term[0].toUpperCase() === l)] as [string, Term[]]);
  return (
    <div>
      <div className="glass flex flex-wrap items-center gap-2 p-4">
        <input value={qtext} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, e.g. STT, pledge, expiry" className="input !w-72" aria-label="Search glossary" />
        <div className="flex flex-wrap gap-1 text-xs">{CATS.map((c) => <button key={c} type="button" onClick={() => setCat(c)} className={clsx("badge !normal-case !tracking-normal", cat === c && "badge-accent")}>{c}</button>)}</div>
        <span className="ml-auto text-xs text-muted">{rows.length} terms</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1 text-xs">{letters.map((l) => <a key={l} href={`#g-${l}`} className="badge">{l}</a>)}</div>
      <div className="mt-4 space-y-6">{grouped.map(([l, list]) => (
        <section key={l} id={`g-${l}`} className="scroll-mt-28">
          <div className="font-display text-lg font-semibold text-accent">{l}</div>
          <dl className="mt-2 grid gap-3 md:grid-cols-2">{list.map((t) => <div key={t.term} className="glass p-4"><dt className="flex items-center justify-between gap-2 font-semibold">{t.term}<span className="badge !text-[10px]">{t.cat}</span></dt><dd className="mt-1 text-sm text-muted">{t.def}{t.see && <> <Link href={t.see} className="text-accent">See it →</Link></>}</dd></div>)}</dl>
        </section>))}</div>
    </div>
  );
}
