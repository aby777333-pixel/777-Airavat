import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Analyser from "./Analyser";

export const metadata = { ...metadataFor("/tools/portfolio-analyser") };

export default function PortfolioAnalyser() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: "/tools/portfolio-analyser", label: "Portfolio analyser" }]} />
      <PageHero variant="calculators" intro={seoFor("/tools/portfolio-analyser").intro}><PageHeader eyebrow="Tools" title="Portfolio analyser" subtitle="Paste holdings from any broker: allocation, concentration, P&L, XIRR and NIFTY 50 overlap, computed in your browser." /></PageHero>
      <Analyser />
      <div className="mt-5"><Notice tone="info">Your CSV stays in the browser; only the symbols are sent to resolve sector and simulated price. The CAS (consolidated account statement) import for mutual funds is planned once the AMFI/RTA integration exists.</Notice></div>
    </div>
  );
}
