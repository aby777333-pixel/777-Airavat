import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import Link from "next/link";
import { PageHeader } from "@/components/ui";

export const metadata = { ...metadataFor("/contact") };

export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHero variant="contact" intro={seoFor("/contact").intro}><PageHeader eyebrow="Contact" title="Reach the AIRAVAT team" /></PageHero>
      <div className="glass p-8 text-sm text-muted">
        <p>The fastest way to reach us during sandbox development is a support ticket from inside your account. Tickets are tracked with timestamps, categories and status so nothing is lost.</p>
        <div className="mt-4 flex gap-3">
          <Link href="/app/support" className="btn btn-primary">Open support</Link>
          <Link href="/signup" className="btn btn-ghost">Create an account</Link>
        </div>
        <p className="mt-6 text-xs text-faint">Official email addresses, phone numbers, branch addresses and grievance officer details will be published here once the legal entity and compliance function exist.</p>
      </div>
    </div>
  );
}
