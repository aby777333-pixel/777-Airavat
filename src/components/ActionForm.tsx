"use client";
import { useState, type ReactNode } from "react";
import clsx from "clsx";

type Result = { ok: boolean; error?: string; data?: unknown };

// Wraps a server action that returns {ok,error} so the error is shown inline instead of crashing the page.
export default function ActionForm({ action, children, className, successText }: { action: (f: FormData) => Promise<Result>; children: ReactNode; className?: string; successText?: string }) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={className}
      action={async (f) => {
        setBusy(true); setState(null);
        const r = await action(f);
        setBusy(false);
        if (!r.ok) setState({ ok: false, text: r.error ?? "Failed" });
        else if (successText) setState({ ok: true, text: successText });
      }}
    >
      <fieldset disabled={busy} className="contents">{children}</fieldset>
      {state && <div role={state.ok ? "status" : "alert"} className={clsx("mt-2 text-xs", state.ok ? "text-profit" : "text-loss")}>{state.text}</div>}
    </form>
  );
}
