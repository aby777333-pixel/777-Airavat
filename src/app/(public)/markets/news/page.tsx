import { redirect } from "next/navigation";

// Market news is published through the AIRAVAT DAILY editorial workflow under the Market Brief category.
export default function MarketNews() { redirect("/daily?category=market-brief"); }
