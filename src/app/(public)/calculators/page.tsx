import PageHero from "@/components/site/PageHero";
import { seoFor, metadataFor } from "@/lib/seo";
import { PageHeader, Notice } from "@/components/ui";
import Calculators from "./Calculators";

export const metadata = { ...metadataFor("/calculators") };

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6">
      <PageHero variant="calculators" intro={seoFor("/calculators").intro}><PageHeader eyebrow="Tools" title="Financial calculators" subtitle="Every calculator shows its formula and assumptions. Outputs are estimates, not guarantees, and the sandbox charge schedule is illustrative." /></PageHero>
      <Calculators />
      <div className="mt-6">
        <Notice tone="info">Formulas are unit-tested in the repository (src/lib/calculators.test.ts). Statutory rates will be re-verified before production.</Notice>
      </div>
    </div>
  );
}
