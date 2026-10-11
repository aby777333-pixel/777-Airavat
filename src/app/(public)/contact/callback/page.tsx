import Link from "next/link";
import { metadataFor, seoFor } from "@/lib/seo";
import { PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import CallbackForm from "./CallbackForm";

export const metadata = { ...metadataFor("/contact/callback") };

export default function CallbackPage() {
  const todayIso = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/contact", label: "Contact" }, { href: "/contact/callback", label: "Request a callback" }]} />
      <PageHero variant="about" intro={seoFor("/contact/callback").intro}><PageHeader eyebrow="Contact" title="Request a callback or a visit" subtitle="Pick a day and a two-hour window; we call in your language, or schedule a documentation visit where a wet signature is unavoidable" /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <CallbackForm todayIso={todayIso} />
        <div className="space-y-4">
          <div className="glass p-5"><div className="font-display font-semibold">What to expect</div><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted"><li>A reference number immediately; the call within the SLA shown after you submit</li><li>Calls come only from numbers listed on the <Link href="/contact" className="underline">contact page</Link>; we never ask for passwords, OTPs or card details</li><li>Visits are for documentation only; representatives carry verifiable ID and never collect cash</li><li>Grievances are tracked with a 48-hour first response</li></ul></div>
          <div className="glass p-5"><div className="font-display font-semibold">Prefer to write?</div><p className="mt-1 text-sm text-muted">The <Link href="/contact" className="text-accent">full enquiry form</Link> captures segments, capital range and more; the <Link href="/company/grievance-redressal" className="text-accent">grievance matrix</Link> lists escalation levels and timelines.</p></div>
          <p className="text-[11px] text-faint">Requests are stored in the AIRAVAT enquiry register with audit trail. Sandbox: no outbound calls are made today.</p>
        </div>
      </div>
    </div>
  );
}
