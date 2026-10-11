import Link from "next/link";
import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import { Card, PageHeader } from "@/components/ui";
import EnquiryForm from "./EnquiryForm";

export const metadata = { ...metadataFor("/contact") };

export default function Contact() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <PageHero variant="contact" intro={seoFor("/contact").intro}><PageHeader eyebrow="Contact" title="Reach the AIRAVAT team" subtitle="General enquiries, account opening, partnerships, developer access, media and grievances. Every enquiry gets a reference number and a response time." /></PageHero>
      <div className="grid gap-6 lg:grid-cols-[1.618fr_1fr]">
        <EnquiryForm />
        <div className="space-y-5">
          <Card title="Support hours" subtitle="Indian Standard Time">
            <dl className="grid grid-cols-2 gap-y-1 text-sm"><dt className="text-muted">Monday to Friday</dt><dd>09:00 – 18:00</dd><dt className="text-muted">Saturday</dt><dd>10:00 – 14:00</dd><dt className="text-muted">Sunday and exchange holidays</dt><dd>Closed</dd><dt className="text-muted">Market-hours priority line</dt><dd>09:00 – 15:45</dd></dl>
            <p className="mt-3 text-xs text-faint">Signed-in clients get faster service through <Link href="/app/support" className="underline">support tickets</Link>, which carry your account context.</p>
          </Card>
          <Card title="Grievance redressal" subtitle="Escalation matrix as it will apply once licensed">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
              <li><strong className="text-text">Level 1</strong>: support desk · acknowledgement within 48 hours, resolution target 7 working days.</li>
              <li><strong className="text-text">Level 2</strong>: compliance officer · escalate with your reference if unresolved after 7 days.</li>
              <li><strong className="text-text">Level 3</strong>: SEBI SCORES (<a className="underline" href="https://scores.sebi.gov.in" target="_blank" rel="noreferrer">scores.sebi.gov.in</a>) and the exchange investor grievance cells (NSE, BSE, MCX), followed by SMART ODR for online dispute resolution.</li>
            </ol>
            <p className="mt-3 text-xs text-faint">Names, email addresses and phone numbers of the compliance officer and grievance officer are published here once the legal entity and SEBI registration exist. Nothing on this page is a claim of authorisation.</p>
          </Card>
          <Card title="Offices" subtitle="To be published">
            <p className="text-sm text-muted">Registered office, corporate office and branch addresses will appear here after incorporation. For now, all contact is through this form, support tickets and the AIRAVAT LIVE assistant.</p>
          </Card>
          <Card title="Other ways in">
            <ul className="space-y-1.5 text-sm">
              <li><Link href="/open-account" className="hover:text-accent">Open an account →</Link></li>
              <li><Link href="/partners" className="hover:text-accent">Partner programme →</Link></li>
              <li><Link href="/developers" className="hover:text-accent">Developer portal →</Link></li>
              <li><Link href="/learn/investor-protection" className="hover:text-accent">Investor charter →</Link></li>
              <li><Link href="/trust" className="hover:text-accent">Trust centre →</Link></li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
