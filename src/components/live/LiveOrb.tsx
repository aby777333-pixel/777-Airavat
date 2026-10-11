"use client";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

type Msg = { role: "user" | "assistant"; content: string };
export type LiveContext = { surface: string; symbol?: string; page?: string };

const LANGS = [["en", "English"], ["hi", "हिन्दी"], ["ta", "தமிழ்"], ["ml", "മലയാളം"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["mr", "मराठी"], ["bn", "বাংলা"], ["gu", "ગુજરાતી"]];

export default function LiveOrb({ context }: { context: LiveContext }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("en");
  const [state, setState] = useState<"idle" | "thinking" | "warning">("idle");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true); setState("thinking");
    try {
      const res = await fetch("/api/live", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: next.slice(-8), context, language: lang }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assistant unavailable");
      setMsgs([...next, { role: "assistant", content: data.reply }]);
      setState("idle");
    } catch (err) {
      setMsgs([...next, { role: "assistant", content: `I could not complete that request (${(err as Error).message}). Core trading and account functions are unaffected.` }]);
      setState("warning");
    } finally { setBusy(false); }
  }

  return (
    <>
      <button
        aria-label={open ? "Close AIRAVAT LIVE" : "Open AIRAVAT LIVE assistant"}
        onClick={() => setOpen(!open)}
        className={clsx("orb fixed bottom-5 right-5 z-50 transition", state === "thinking" && "breathe", state === "warning" && "ring-2 ring-warn")}
      />
      {open && (
        <div role="dialog" aria-label="AIRAVAT LIVE" className="glass-strong fixed bottom-24 right-5 z-50 flex h-[min(70vh,560px)] w-[min(92vw,400px)] flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-display text-sm font-semibold">AIRAVAT LIVE</div>
              <div className="text-[11px] text-faint">AI assistant · cannot place orders · may make mistakes</div>
            </div>
            <select aria-label="Language" className="select !w-auto !py-1 !text-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
            </select>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
            {msgs.length === 0 && (
              <div className="text-muted">
                <p>Namaste. I can explain markets, products, charges, risk checks and what you see on this screen{context.symbol ? ` (${context.symbol})` : ""}.</p>
                <p className="mt-2 text-xs text-faint">I do not give personalised investment advice and I cannot trade for you. Everything here is a simulated environment.</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={clsx("max-w-[90%] rounded-xl px-3 py-2 whitespace-pre-wrap", m.role === "user" ? "ml-auto bg-accent/15" : "bg-bg/50 text-muted")}>{m.content}</div>
            ))}
            {busy && <div className="skeleton h-8 w-2/3 rounded-xl" />}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
            <input className="input" placeholder="Ask about this screen…" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Message" />
            <button className="btn btn-primary btn-sm" disabled={busy || !input.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
