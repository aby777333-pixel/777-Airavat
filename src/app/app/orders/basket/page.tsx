import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getQuotes } from "@/lib/market";
import { Notice, PageHeader } from "@/components/ui";
import BasketBuilder from "./BasketBuilder";

export default async function BasketPage() {
  await requireUser("/app/orders/basket");
  const quotes = await getQuotes();
  const symbols = quotes.filter((q) => q.segment === "EQ" && q.tradable).map((q) => ({ symbol: q.symbol, ltp: q.quote.ltp, lot: q.lot_size }));
  return (
    <>
      <PageHeader eyebrow="Orders" title="Basket builder" subtitle="Up to 20 legs placed in one go. Each leg is a normal order with its own risk check, so a rejected leg never blocks the others." action={<Link href="/app/orders" className="btn btn-ghost btn-sm">← Orders</Link>} />
      <Notice tone="info">Multi-leg strategies are expressed as baskets. Legs execute sequentially at the simulated exchange; there is no atomic all-or-none guarantee, which is how exchange-native baskets behave too.</Notice>
      <div className="mt-5"><BasketBuilder symbols={symbols} /></div>
    </>
  );
}
