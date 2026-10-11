"use client";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Registers the service worker and offers the browser's install prompt once it is available.
export default function PwaRegister() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* registration is best-effort */ }); };
    if (document.readyState === "complete") onLoad(); else window.addEventListener("load", onLoad, { once: true });
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("load", onLoad); };
  }, []);
  if (!installEvt || hidden) return null;
  return (
    <div role="dialog" aria-label="Install AIRAVAT" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-surface-solid px-4 py-2 text-sm shadow-lg">
      <span>Install AIRAVAT as an app</span>
      <button className="btn btn-primary btn-sm" onClick={async () => { await installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }}>Install</button>
      <button className="btn btn-ghost btn-sm" aria-label="Dismiss" onClick={() => setHidden(true)}>✕</button>
    </div>
  );
}
