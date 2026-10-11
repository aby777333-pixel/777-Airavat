import { getCandles, getQuotes } from "@/lib/market";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import ReplayChart from "@/components/market/ReplayChart";

export const metadata = { title: "Market replay: practise on simulated candles bar by bar", description: "Replay roughly 300 simulated daily candles for any sandbox instrument one bar at a time, mark a hypothetical entry and see how it would have played out.", keywords: ["market replay tool", "bar replay", "chart replay practice", "trading simulator"] };

export default async function Replay({ searchParams }: { searchParams: Promise<{ symbol?: string }> }) {
  const { symbol = "RELIANCE" } = await searchParams;
  const quotes = await getQuotes();
  const inst = quotes.find((q) => q.symbol === symbol.toUpperCase()) ?? quotes.find((q) => q.symbol === "RELIANCE")!;
  const candles = await getCandles(inst.id, "1d", 300);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: "/tools/replay", label: "Market replay" }]} />
      <PageHero variant="instrument" intro="Replay hides the future and lets you step through history one bar at a time, which is the only honest way to practise reading price action. Mark a hypothetical entry and watch the outcome unfold; then try the same idea in a Shadow Portfolio with charges."><PageHeader eyebrow="Tools" title="Market replay" subtitle="Simulated daily candles. Not a prediction tool." /></PageHero>
      <Notice tone="warn">Candles are synthetic sandbox history, not exchange data.</Notice>
      <form className="my-4 flex gap-2 text-sm"><select className="select w-auto" name="symbol" defaultValue={inst.symbol}>{quotes.filter((q) => q.segment !== "INDEX").map((q) => <option key={q.id} value={q.symbol}>{q.symbol}</option>)}</select><button className="btn btn-ghost">Load</button></form>
      <ReplayChart candles={candles} symbol={inst.symbol} />
    </div>
  );
}
