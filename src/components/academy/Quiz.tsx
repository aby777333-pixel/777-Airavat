"use client";
import { useState } from "react";
import clsx from "clsx";
import type { QuizQ } from "@/lib/chart-school";

// Short self-check quiz; scores stay in the browser.
export default function Quiz({ title, questions }: { title: string; questions: QuizQ[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const score = questions.reduce((s, q, i) => s + (picked[i] === q.answer ? 1 : 0), 0);
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between"><div className="font-display font-semibold">{title}</div>{done && <span className={clsx("badge", score === questions.length ? "badge-ok" : "badge-info")}>{score} / {questions.length}</span>}</div>
      <ol className="mt-3 space-y-4">{questions.map((q, i) => (
        <li key={i}><div className="text-sm font-medium">{i + 1}. {q.q}</div>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">{q.options.map((o, j) => <button key={j} type="button" disabled={done} onClick={() => setPicked((p) => ({ ...p, [i]: j }))} className={clsx("rounded-md border px-3 py-1.5 text-left text-sm", picked[i] === j ? "border-accent bg-accent/10" : "border-border", done && j === q.answer && "border-profit bg-profit/10", done && picked[i] === j && j !== q.answer && "border-loss bg-loss/10")}>{o}</button>)}</div>
          {done && <div className="mt-1 text-xs text-muted">{q.why}</div>}
        </li>))}</ol>
      <div className="mt-4 flex gap-2">{!done ? <button type="button" className="btn btn-primary btn-sm" disabled={Object.keys(picked).length < questions.length} onClick={() => setDone(true)}>Check answers</button> : <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setPicked({}); setDone(false); }}>Try again</button>}</div>
    </div>
  );
}
