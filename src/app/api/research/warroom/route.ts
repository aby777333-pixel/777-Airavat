import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// AI Research War Room: four perspectives (bull, bear, neutral, auditor) over the case's recorded evidence only.
// The model receives the evidence board (facts/estimates/hypotheses as classified) and must not invent data.
const PROMPT_VERSION = "warroom-v1.0";
const MODEL = process.env.AIRAVAT_LIVE_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are the AIRAVAT Research Council operating inside a SANDBOX with SIMULATED market data.
You will receive an evidence board for a research case. Produce exactly four short sections, each 60-120 words, in this JSON shape:
{"bull": "...", "bear": "...", "neutral": "...", "auditor": "..."}
Rules: use only the evidence provided; label anything not in the evidence as a hypothesis; never give buy/sell recommendations or price targets;
state what data is missing (there is no licensed fundamentals, news or disclosure feed); the auditor section must list contradictions, stale data and what would invalidate each case.
Remind readers the prices are simulated. Output JSON only.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ case_id: z.number().int().positive() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  const { data: c } = await supabase.from("research_cases").select("*, instrument:instruments(symbol,name,sector)").eq("id", parsed.data.case_id).maybeSingle();
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });
  const { data: ev } = await supabase.from("research_evidence").select("kind,title,body,source,classification,observed_at").eq("case_id", c.id).order("id");
  const board = (ev ?? []).map((e) => `- [${e.classification.toUpperCase()}] ${e.title}: ${e.body ?? ""} (source: ${e.source}, observed ${e.observed_at})`).join("\n");
  const client = new Anthropic();
  try {
    const res = await client.messages.create({
      model: MODEL, max_tokens: 1200, system: SYSTEM,
      messages: [{ role: "user", content: `Case: ${c.title}\nQuestion: ${c.question ?? "(none)"}\nInstrument: ${c.instrument ? JSON.stringify(c.instrument) : "none"}\n\nEvidence board:\n${board || "(no evidence recorded)"}` }],
    });
    const text = res.content.filter((x) => x.type === "text").map((x) => (x.type === "text" ? x.text : "")).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as Record<string, string>;
    const stances = ["bull", "bear", "neutral", "auditor"] as const;
    for (const s of stances) if (json[s]) await supabase.rpc("add_research_finding", { p_case: c.id, p_stance: s, p_body: json[s], p_generated_by: "ai", p_model: MODEL, p_prompt_version: PROMPT_VERSION });
    await supabase.rpc("log_ai_interaction", { p: { provider: "anthropic", model: MODEL, prompt_version: PROMPT_VERSION, classification: "research_warroom", input_chars: board.length, output_chars: text.length, tokens_in: res.usage?.input_tokens ?? null, tokens_out: res.usage?.output_tokens ?? null, tools_used: ["evidence_board"] } }).then(() => undefined, () => undefined);
    return NextResponse.json({ ok: true, findings: json, model: MODEL, prompt_version: PROMPT_VERSION });
  } catch (err) {
    await supabase.rpc("log_ai_interaction", { p: { provider: "anthropic", model: MODEL, prompt_version: PROMPT_VERSION, classification: "research_warroom", outcome: "error" } }).then(() => undefined, () => undefined);
    return NextResponse.json({ error: `Research council unavailable: ${(err as Error).message.slice(0, 120)}` }, { status: 502 });
  }
}
