"use client";
import { useState } from "react";
import clsx from "clsx";
import type { QuizQ } from "@/lib/chart-school";
import { markDone } from "../../TrackProgress";

export default function LessonQuiz({ track, lesson, questions }: { track: string; lesson: string; questions: QuizQ[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);
  const score = questions.reduce((s, q, i) => s + (picked[i] === q.answer ? 1 : 0), 0);
  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between"><div className="font-display font-semibold">Lesson check</div>{done && <span className={clsx("badge", score === questions.length ? "badge-ok" : "badge-info")}>{score} / {questions.length}</span>}</div>
      <ol className="mt-3 space-y-3">{questions.map((q, i) => (<li key={i}><div className="text-sm">{q.q}</div><div className="mt-1 grid gap-1">{q.options.map((o, j) => <button key={j} type="button" disabled={done} onClick={() => setPicked((p) => ({ ...p, [i]: j }))} className={clsx("rounded-md border px-3 py-1 text-left text-sm", picked[i] === j ? "border-accent bg-accent/10" : "border-border", done && j === q.answer && "border-profit bg-profit/10", done && picked[i] === j && j !== q.answer && "border-loss bg-loss/10")}>{o}</button>)}</div>{done && <div className="mt-1 text-xs text-muted">{q.why}</div>}</li>))}</ol>
      <div className="mt-3">{!done ? <button type="button" className="btn btn-primary btn-sm" disabled={Object.keys(picked).length < questions.length} onClick={() => { setDone(true); markDone(track, lesson); }}>Check and mark lesson done</button> : <span className="text-xs text-profit">Saved to your browser progress.</span>}</div>
    </div>
  );
}
