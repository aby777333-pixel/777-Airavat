import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// AI Editorial Copilot (staff only). Produces drafts/outlines/headlines/SEO that humans must review before publication.
const PROMPT_VERSION = "editorial-v1.0";
const MODEL = process.env.AIRAVAT_LIVE_MODEL || "claude-sonnet-5-5";
const schema = z.object({ task: z.enum(["outline", "draft", "headlines", "seo", "summary", "factcheck"]), topic: z.string().min(3).max(300), body: z.string().max(12000).optional(), category: z.string().max(60).optional() });

const SYSTEM = `You are the AIRAVAT DAILY editorial copilot for an Indian brokerage that is currently a SANDBOX (simulated data, no regulatory registrations).
Write educational, factual, source-conscious financial content for Indian readers. Never invent statistics, prices, quotes, company events or regulatory facts; where a fact is needed, write [SOURCE NEEDED].
Never give personalised investment advice or predictions. Keep claims verifiable. Markdown output.`;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["editor", "compliance", "admin", "super_admin"].includes(profile.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  const { task, topic, body, category } = parsed.data;
  const instructions: Record<typeof task, string> = {
    outline: "Produce a structured outline (H2/H3) with 1-line notes per section and a list of facts that would need sources.",
    draft: "Write a 600-900 word educational article draft with [SOURCE NEEDED] markers. Include a short 'What this is not' disclaimer paragraph.",
    headlines: "Give 8 headline options: 4 factual/plain, 4 engaging but non-sensational. No promises of returns.",
    seo: "Return an SEO title (<=60 chars), meta description (<=155 chars), 6 tags and 3 FAQ questions with short factual answers.",
    summary: "Summarise the body in 3 bullet points plus a 1-sentence dek.",
    factcheck: "List every numerical or factual claim in the body with a verdict: SUPPORTED (by text), NEEDS SOURCE, or UNVERIFIABLE; flag misleading headlines and missing disclosures.",
  };
  const client = new Anthropic();
  try {
    const res = await client.messages.create({ model: MODEL, max_tokens: 1600, system: SYSTEM, messages: [{ role: "user", content: `Task: ${task}\n${instructions[task]}\nCategory: ${category ?? "general"}\nTopic: ${topic}\n${body ? `\nBody:\n${body}` : ""}` }] });
    const text = res.content.filter((x) => x.type === "text").map((x) => (x.type === "text" ? x.text : "")).join("\n");
    await supabase.rpc("log_ai_interaction", { p: { provider: "anthropic", model: MODEL, prompt_version: PROMPT_VERSION, classification: `editorial_${task}`, input_chars: topic.length + (body?.length ?? 0), output_chars: text.length, tokens_in: res.usage?.input_tokens ?? null, tokens_out: res.usage?.output_tokens ?? null } }).then(() => undefined, () => undefined);
    return NextResponse.json({ ok: true, text, model: MODEL, prompt_version: PROMPT_VERSION, review_required: true });
  } catch (err) {
    return NextResponse.json({ error: `Copilot unavailable: ${(err as Error).message.slice(0, 120)}` }, { status: 502 });
  }
}
