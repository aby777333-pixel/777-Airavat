import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import ChargesExplainer from "./ChargesExplainer";

export const metadata = { ...metadataFor("/pricing/explainer") };

export default function ExplainerPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/pricing", label: "Pricing" }, { href: "/pricing/explainer", label: "Interactive explainer" }]} />
      <PageHero variant="pricing" intro={seoFor("/pricing/explainer").intro}><PageHeader eyebrow="Pricing" title="What a trade really costs" subtitle="Drag the trade value, switch segment and side, and watch every levy change with its formula shown" /></PageHero>
      <ChargesExplainer />
      <div className="mt-5"><Notice tone="info">Estimates for one executed order under the published schedule. Exchange rates and statutory levies change by circular; the schedule version is shown in the panel. Not advice.</Notice></div>
    </div>
  );
}
