"use client";
import { useState } from "react";
import clsx from "clsx";

type Lang = "curl" | "python" | "node" | "go";
const LANGS: [Lang, string][] = [["curl", "curl"], ["python", "Python"], ["node", "Node / TypeScript"], ["go", "Go"]];

function snippets(base: string): Record<string, Record<Lang, string>> {
  return {
    "Who am I": {
      curl: `curl -s ${base}/auth/whoami \\\n  -H "X-API-Key: $AIRAVAT_KEY"`,
      python: `import os, requests\nBASE = "${base}"\nH = {"X-API-Key": os.environ["AIRAVAT_KEY"]}\nprint(requests.get(f"{BASE}/auth/whoami", headers=H, timeout=10).json())`,
      node: `const BASE = "${base}";\nconst H = { "X-API-Key": process.env.AIRAVAT_KEY! };\nconst me = await fetch(\`\${BASE}/auth/whoami\`, { headers: H }).then(r => r.json());\nconsole.log(me.scopes, me.rate);`,
      go: `req, _ := http.NewRequest("GET", "${base}/auth/whoami", nil)\nreq.Header.Set("X-API-Key", os.Getenv("AIRAVAT_KEY"))\nres, err := http.DefaultClient.Do(req)\nif err != nil { log.Fatal(err) }\ndefer res.Body.Close()\nio.Copy(os.Stdout, res.Body)`,
    },
    "Quotes": {
      curl: `curl -s "${base}/quotes?symbols=RELIANCE,TCS,NIFTY%2050" \\\n  -H "X-API-Key: $AIRAVAT_KEY"`,
      python: `q = requests.get(f"{BASE}/quotes", params={"symbols": "RELIANCE,TCS"}, headers=H, timeout=10).json()\nfor row in q["quotes"]:\n    print(row["symbol"], row["ltp"], row["change_pct"])`,
      node: `const q = await fetch(\`\${BASE}/quotes?symbols=RELIANCE,TCS\`, { headers: H }).then(r => r.json());\nfor (const row of q.quotes) console.log(row.symbol, row.ltp);`,
      go: `u := "${base}/quotes?symbols=RELIANCE,TCS"\nreq, _ := http.NewRequest("GET", u, nil)\nreq.Header.Set("X-API-Key", key)\n// decode into a struct with Ok bool and Quotes []struct{ Symbol string; Ltp string }`,
    },
    "Place an order (idempotent)": {
      curl: `curl -s -X POST ${base}/orders \\\n  -H "X-API-Key: $AIRAVAT_KEY" -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: $(uuidgen)" \\\n  -d '{"symbol":"RELIANCE","side":"BUY","qty":1,"order_type":"LIMIT","price":"2450.00","product":"CNC"}'`,
      python: `import uuid\norder = {"symbol": "RELIANCE", "side": "BUY", "qty": 1, "order_type": "LIMIT", "price": "2450.00", "product": "CNC"}\nr = requests.post(f"{BASE}/orders", json=order, headers={**H, "Idempotency-Key": str(uuid.uuid4())}, timeout=10)\nres = r.json()\nif not res["ok"]:\n    print("rejected:", res["error"])  # e.g. PRICE_OUTSIDE_BAND; read /orders/{id} for the RMS trail\nelse:\n    print("order", res["order_id"], res["status"])`,
      node: `const res = await fetch(\`\${BASE}/orders\`, {\n  method: "POST",\n  headers: { ...H, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },\n  body: JSON.stringify({ symbol: "RELIANCE", side: "BUY", qty: 1, order_type: "LIMIT", price: "2450.00", product: "CNC" }),\n}).then(r => r.json());\nif (!res.ok) console.error("rejected", res.error); else console.log(res.order_id, res.status);`,
      go: `body := strings.NewReader(\`{"symbol":"RELIANCE","side":"BUY","qty":1,"order_type":"LIMIT","price":"2450.00","product":"CNC"}\`)\nreq, _ := http.NewRequest("POST", "${base}/orders", body)\nreq.Header.Set("X-API-Key", key)\nreq.Header.Set("Content-Type", "application/json")\nreq.Header.Set("Idempotency-Key", uuid.NewString())\nres, err := http.DefaultClient.Do(req) // 201 on success, 400 with error code on an RMS rejection`,
    },
    "GTT (conditional order)": {
      curl: `curl -s -X POST ${base}/conditional-orders \\\n  -H "X-API-Key: $AIRAVAT_KEY" -H "Content-Type: application/json" \\\n  -d '{"kind":"GTT","symbol":"TCS","side":"BUY","qty":5,"trigger_price":"3400.00","price":"3395.00","product":"CNC"}'`,
      python: `gtt = {"kind": "GTT", "symbol": "TCS", "side": "BUY", "qty": 5, "trigger_price": "3400.00", "price": "3395.00", "product": "CNC"}\nprint(requests.post(f"{BASE}/conditional-orders", json=gtt, headers=H, timeout=10).json())`,
      node: `const gtt = { kind: "GTT", symbol: "TCS", side: "BUY", qty: 5, trigger_price: "3400.00", price: "3395.00", product: "CNC" };\nconsole.log(await fetch(\`\${BASE}/conditional-orders\`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(gtt) }).then(r => r.json()));`,
      go: `body := strings.NewReader(\`{"kind":"GTT","symbol":"TCS","side":"BUY","qty":5,"trigger_price":"3400.00","price":"3395.00","product":"CNC"}\`)\nreq, _ := http.NewRequest("POST", "${base}/conditional-orders", body)\nreq.Header.Set("X-API-Key", key); req.Header.Set("Content-Type", "application/json")`,
    },
    "Stream quotes (SSE)": {
      curl: `curl -N "${base}/stream?symbols=RELIANCE,INFY" -H "X-API-Key: $AIRAVAT_KEY"`,
      python: `with requests.get(f"{BASE}/stream", params={"symbols": "RELIANCE,INFY"}, headers=H, stream=True, timeout=60) as s:\n    for line in s.iter_lines():\n        if line.startswith(b"data:"):\n            print(line[5:].decode())`,
      node: `// Node 18+: EventSource is not built in; read the body as a stream\nconst res = await fetch(\`\${BASE}/stream?symbols=RELIANCE,INFY\`, { headers: H });\nfor await (const chunk of res.body!) process.stdout.write(Buffer.from(chunk).toString());`,
      go: `req, _ := http.NewRequest("GET", "${base}/stream?symbols=RELIANCE,INFY", nil)\nreq.Header.Set("X-API-Key", key)\nres, _ := http.DefaultClient.Do(req)\nsc := bufio.NewScanner(res.Body)\nfor sc.Scan() { fmt.Println(sc.Text()) } // lines: "event: quotes" then "data: {...}"`,
    },
  };
}

export default function Snippets({ base }: { base: string }) {
  const [lang, setLang] = useState<Lang>("curl");
  const S = snippets(base);
  return (
    <section id="snippets" className="glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-lg font-semibold">SDK snippets</h2><div className="flex gap-1">{LANGS.map(([k, l]) => <button key={k} type="button" onClick={() => setLang(k)} className={clsx("badge !normal-case !tracking-normal", lang === k && "badge-accent")}>{l}</button>)}</div></div>
      <p className="mt-1 text-xs text-muted">Plain HTTP in every language; no SDK package is published yet. Field names match the OpenAPI document.</p>
      <div className="mt-3 space-y-4">{Object.entries(S).map(([title, code]) => <div key={title} id={title === "GTT (conditional order)" ? "conditional" : undefined}><div className="text-sm font-semibold">{title}</div><pre className="mt-1 overflow-x-auto rounded-lg border border-border bg-bg p-3 text-xs leading-relaxed"><code>{code[lang]}</code></pre></div>)}</div>
    </section>
  );
}
