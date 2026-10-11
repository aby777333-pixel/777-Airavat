"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerMedia } from "./actions";

// Uploads with the staff member's own session to the public site-media bucket, then registers the asset with alt text.
export default function MediaUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const f = new FormData(e.currentTarget);
    const file = f.get("file") as File | null; const alt = String(f.get("alt") || "");
    if (!file || !file.size) { setMsg("Choose a file."); setBusy(false); return; }
    if (file.size > 8 * 1024 * 1024) { setMsg("Max 8 MB."); setBusy(false); return; }
    const supabase = createClient();
    const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) { setMsg(`Upload failed: ${error.message}`); setBusy(false); return; }
    const { data } = supabase.storage.from("site-media").getPublicUrl(path);
    const reg = new FormData(); reg.set("url", data.publicUrl); reg.set("alt", alt); reg.set("kind", file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "document"); reg.set("tags", String(f.get("tags") || ""));
    const r = await registerMedia(reg);
    setMsg(r.ok ? "Uploaded and registered." : r.error ?? "Registration failed"); setBusy(false); router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-4 gap-2 text-sm">
      <input className="input col-span-2" type="file" name="file" accept="image/*,video/*,.pdf" />
      <input className="input" name="alt" placeholder="Alt text (required)" required minLength={3} />
      <input className="input" name="tags" placeholder="tags" />
      <button className="btn btn-primary btn-sm col-span-4" disabled={busy}>{busy ? "Uploading…" : "Upload to media library"}</button>
      {msg && <p className="col-span-4 text-xs text-muted" role="status">{msg}</p>}
    </form>
  );
}
