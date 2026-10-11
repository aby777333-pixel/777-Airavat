import { PageHeader, Notice } from "@/components/ui";
import Gallery from "./Gallery";
import { SHOWROOM } from "@/lib/showroom";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const metadata = { title: "Living Product Showroom", description: "Authentic screenshots of AIRAVAT modules captured from the deployed sandbox. Click to zoom, pan and navigate." };

export default function Showroom() {
  // Only images that actually exist in /public/showroom are shown; anything else is listed as pending, never faked.
  const items = SHOWROOM.map((it) => (it.src && !existsSync(join(process.cwd(), "public", it.src)) ? { ...it, src: undefined, capturedAt: undefined, pending: it.pending ?? "Capture pending for this deployment." } : it));
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Living Product Showroom" title="Explore the AIRAVAT experience" subtitle="Every image below is a real capture of the deployed sandbox, taken with a demonstration account. Nothing is mocked; incomplete modules are listed as pending rather than pictured." />
      <Notice tone="warn">Screens show simulated market data and simulated funds. Module availability is described on the Platforms page.</Notice>
      <div className="mt-6"><Gallery items={items} /></div>
    </div>
  );
}
