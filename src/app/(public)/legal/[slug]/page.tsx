import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/lib/markdown";
import { Badge } from "@/components/ui";

export default async function Legal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: doc } = await supabase.from("legal_documents").select("*").eq("slug", slug).order("version", { ascending: false }).limit(1).maybeSingle();
  if (!doc) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-faint">
        <Badge tone="sim">Draft</Badge> Version {doc.version} · effective {doc.effective_from} · hash {doc.content_hash.slice(0, 12)}…
      </div>
      <div className="glass p-8"><Markdown source={doc.body_md} /></div>
    </div>
  );
}
