import { getQuotes } from "@/lib/market";
import { getSession } from "@/lib/auth";
import { metadataFor, seoFor } from "@/lib/seo";
import { Notice, PageHeader, SimBadge } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import PublicWatchlist from "./PublicWatchlist";

export const metadata = { ...metadataFor("/markets/watchlist") };
export const dynamic = "force-dynamic";

export default async function WatchlistPage({ searchParams }: { searchParams: Promise<{ migrate?: string }> }) {
  const { migrate } = await searchParams;
  const [rows, { user }] = await Promise.all([getQuotes(), getSession()]);
  const universe = rows.map((r) => ({ symbol: r.symbol, name: r.name, segment: r.segment }));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/markets", label: "Markets" }, { href: "/markets/watchlist", label: "Watchlist" }]} />
      <PageHero variant="markets" intro={seoFor("/markets/watchlist").intro}><PageHeader eyebrow="Markets" title="Your watchlist, no account needed" subtitle={<>Live simulated quotes, price alerts in the browser, one click to keep it when you sign up <SimBadge /></>} /></PageHero>
      <PublicWatchlist universe={universe} signedIn={!!user} wantsMigrate={migrate === "1"} />
      <div className="mt-5"><Notice tone="info">Browser alerts fire only while this page is open and are not a substitute for account alerts, which the server evaluates. Nothing here places orders.</Notice></div>
    </div>
  );
}
