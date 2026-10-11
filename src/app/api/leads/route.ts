import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  interest: z.string().max(200).optional(),
  consent_marketing: z.boolean().optional(),
  source: z.string().max(40).optional(),
  website: z.string().max(0).optional(), // honeypot
});

// Public interest form → CRM lead (consent recorded; no marketing without it)
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the form." }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // bot
  if (!d.email && !d.phone) return NextResponse.json({ error: "Provide an email or a mobile number." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_lead", { p: { full_name: d.full_name, email: d.email || null, phone: d.phone || null, source: d.source || "website", consent_marketing: !!d.consent_marketing, notes: d.interest || null } });
  if (error) return NextResponse.json({ error: "Could not record your interest right now." }, { status: 500 });
  return NextResponse.json({ ok: true, lead_id: data });
}
