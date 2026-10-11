import { createClient } from "@/lib/supabase/server";

// Server-sent events stream of simulated quotes. Serverless-friendly: each connection lives up to 55 seconds; clients reconnect.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = req.headers.get("x-api-key") ?? url.searchParams.get("api_key");
  const supabase = await createClient();
  if (!key) return new Response("MISSING_API_KEY", { status: 401 });
  const { data: who } = await supabase.rpc("api_call", { p_key: key, p_action: "auth.whoami", p_params: {} });
  if (!(who as { ok?: boolean })?.ok) return new Response("INVALID_KEY", { status: 401 });
  const symbols = (url.searchParams.get("symbols") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      send("hello", { environment: "sandbox", data_source: "SIMULATED", ttl_seconds: 55 });
      const started = Date.now();
      try {
        while (Date.now() - started < 55000) {
          const { data } = await supabase.rpc("api_call", { p_key: key, p_action: "quotes.get", p_params: symbols.length ? { symbols } : {} });
          send("quotes", data);
          await new Promise((r) => setTimeout(r, 2000));
        }
        send("bye", { reason: "ttl" });
      } catch (e) { send("error", { message: (e as Error).message }); }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" } });
}
