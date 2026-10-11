import { metadataFor, seoFor } from "@/lib/seo";
import { Badge, Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import PassportReplay from "./PassportReplay";

export const metadata = { ...metadataFor("/platforms/order-passport") };

export default function OrderPassportDemo() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/platforms", label: "Platforms" }, { href: "/platforms/order-passport", label: "Order passport" }]} />
      <PageHero variant="trust" intro={seoFor("/platforms/order-passport").intro}><PageHeader eyebrow="AIRAVAT CLEARVIEW" title="Order passport, replayed" subtitle={<>Watch a sandbox order travel from ticket to ledger, one event at a time, including a rejection <Badge tone="sim">Simulated</Badge></>} /></PageHero>
      <PassportReplay />
      <div className="mt-5"><Notice tone="info">Timings are illustrative; the sandbox writes all events of an order in one database transaction. Exchange and trade ids are simulated. Education, not advice.</Notice></div>
    </div>
  );
}
