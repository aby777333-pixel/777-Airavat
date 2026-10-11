import type { ReactNode } from "react";

// Minimal, safe Markdown renderer for our own legal/academy content (headings, bold, lists, paragraphs).
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split(/\r?\n/);
  const out: ReactNode[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.type;
    out.push(<Tag key={out.length}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("# ")) { flush(); out.push(<h1 key={out.length}>{inline(line.slice(2))}</h1>); continue; }
    if (line.startsWith("## ")) { flush(); out.push(<h2 key={out.length}>{inline(line.slice(3))}</h2>); continue; }
    if (/^[-*] /.test(line)) { if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; } list.items.push(line.slice(2)); continue; }
    if (/^\d+\. /.test(line)) { if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; } list.items.push(line.replace(/^\d+\. /, "")); continue; }
    flush();
    out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="prose">{out}</div>;
}
