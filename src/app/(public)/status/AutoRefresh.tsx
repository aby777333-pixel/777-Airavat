"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-renders the server page on an interval so the status stays current without a client-side data model.
export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => { const id = window.setInterval(() => router.refresh(), seconds * 1000); return () => window.clearInterval(id); }, [router, seconds]);
  return <p className="mb-4 text-xs text-muted">Refreshes every {seconds} seconds.</p>;
}
