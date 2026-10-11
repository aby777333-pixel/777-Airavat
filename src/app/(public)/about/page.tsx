import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import { PageHeader } from "@/components/ui";

export const metadata = { ...metadataFor("/about") };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHero variant="about" intro={seoFor("/about").intro}><PageHeader eyebrow="About" title="AIRAVAT" subtitle="Strength without aggression. Intelligence without arrogance. Luxury without excess." /></PageHero>
      <div className="glass prose p-8">
        <p>AIRAVAT is being engineered as a complete, independent Indian securities brokerage platform: a public website, client trading applications, a professional terminal, an algorithmic and research environment, and the broker back office that reconciles and settles every trade.</p>
        <h2>Our philosophy</h2>
        <p>Real functionality, correct financial records, operational resilience and regulatory compliance take precedence over visual sophistication. The elephant stands for stability, memory, patience and disciplined power.</p>
        <h2>Where we are</h2>
        <p>Today AIRAVAT runs a sandbox: simulated market data, simulated funds and a working order, risk and ledger core. Regulatory registrations, exchange memberships, depository arrangements and market-data licences have not been obtained, and nothing on this site should be read as a claim that they have.</p>
        <h2>Leadership and governance</h2>
        <p>Leadership profiles, corporate information and governance disclosures will be published once the legal entity is formed. We do not publish placeholders as facts.</p>
      </div>
    </div>
  );
}
