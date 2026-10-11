import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { translate } from "@/lib/sarvam";

const schema = z.object({ text: z.string().min(1).max(2000), target: z.string().min(2).max(6), source: z.string().default("en-IN") });

// Authenticated-only translation of UI/explanatory text. Legal documents are never auto-translated.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!process.env.SARVAM_API_KEY) return NextResponse.json({ error: "BHASHA not configured" }, { status: 503 });
  const out = await translate(parsed.data.text, parsed.data.source, parsed.data.target);
  if (!out) return NextResponse.json({ error: "Translation unavailable" }, { status: 502 });
  await supabase.rpc("log_ai_interaction", { p: { provider: "sarvam", model: "translate", prompt_version: "bhasha-v1", classification: "translation", input_chars: parsed.data.text.length, output_chars: out.length } }).then(() => undefined, () => undefined);
  return NextResponse.json({ translated: out, provider: "sarvam" });
}
