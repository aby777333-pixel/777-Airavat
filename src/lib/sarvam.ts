// AIRAVAT BHASHA — Sarvam translation adapter (server-side only).
// Language codes follow BCP-47 style used by Sarvam (e.g. hi-IN). Never used for legal/regulated text.

const MAP: Record<string, string> = { hi: "hi-IN", ta: "ta-IN", ml: "ml-IN", te: "te-IN", kn: "kn-IN", mr: "mr-IN", bn: "bn-IN", gu: "gu-IN", pa: "pa-IN", od: "od-IN", en: "en-IN" };

export function toSarvamLang(code: string) {
  return MAP[code] ?? (code.includes("-") ? code : null);
}

export async function translate(text: string, source: string, targetCode: string): Promise<string | null> {
  const key = process.env.SARVAM_API_KEY;
  const target = toSarvamLang(targetCode);
  if (!key || !target || target === source) return null;
  try {
    const res = await fetch("https://api.sarvam.ai/translate", {
      method: "POST",
      headers: { "content-type": "application/json", "api-subscription-key": key },
      body: JSON.stringify({ input: text.slice(0, 2000), source_language_code: source, target_language_code: target, mode: "formal", numerals_format: "international" }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translated_text?: string };
    return data.translated_text ?? null;
  } catch {
    return null;
  }
}
