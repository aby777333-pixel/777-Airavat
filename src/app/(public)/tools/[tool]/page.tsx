import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Calculators, { type Tab } from "../../calculators/Calculators";
import OptionsLab from "../OptionsLab";
import { getQuotes } from "@/lib/market";
import { SITE } from "@/lib/seo";
import { isoAgo } from "@/lib/time";

const TOOLS: Record<string, { title: string; h1: string; desc: string; keywords: string[]; tab?: Tab; intro: string }> = {
  "brokerage-calculator": { title: "Brokerage calculator: exact charges for any NSE trade", h1: "Brokerage calculator", desc: "Calculate brokerage, STT, exchange charges, SEBI fee, stamp duty and GST for delivery and intraday trades, plus the break-even move.", keywords: ["brokerage calculator", "STT calculator", "intraday charges calculator", "delivery charges calculator", "break even calculator"], tab: "Brokerage", intro: "Enter quantity, buy and sell prices and the product; the calculator shows every charge line on both legs, total cost, net P&L and the break-even move per share. Switch to All segments for F&O, currency and commodity trades." },
  "margin-calculator": { title: "Margin calculator: intraday and delivery requirements", h1: "Margin calculator", desc: "Estimate the funds required for intraday (MIS) and delivery (CNC) orders using the sandbox margin policy.", keywords: ["margin calculator", "intraday margin", "MIS margin requirement", "leverage calculator"], tab: "Margin", intro: "Intraday margin is a percentage of order value set by the risk desk (20% in the sandbox); delivery requires full value plus charges. The result shows the amount the risk engine will hold." },
  "sip-calculator": { title: "SIP calculator: monthly investment growth", h1: "SIP calculator", desc: "Project the future value of a monthly SIP for a given expected return and period, with the formula shown.", keywords: ["SIP calculator", "mutual fund SIP returns", "monthly investment calculator"], tab: "SIP", intro: "A SIP invests a fixed amount every month. Future value compounds monthly; expected returns are assumptions, not promises." },
  "cagr-calculator": { title: "CAGR calculator: compound annual growth rate", h1: "CAGR calculator", desc: "Compute the annualised growth rate between a starting and ending value over a number of years.", keywords: ["CAGR calculator", "annualised return calculator", "compound growth"], tab: "CAGR", intro: "CAGR smooths a total return into an equivalent constant annual rate: (End ÷ Start)^(1/years) − 1." },
  "xirr-calculator": { title: "XIRR calculator: return on irregular cash flows", h1: "XIRR calculator", desc: "Compute the annualised return of investments and withdrawals made on different dates, the right measure for SIPs and portfolios.", keywords: ["XIRR calculator", "portfolio return calculator", "SIP XIRR", "irregular cash flow return"], tab: "XIRR", intro: "XIRR finds the single annual rate that makes the present value of all dated cash flows zero. It is the correct return measure when money goes in and out on different dates." },
  "emi-calculator": { title: "EMI calculator: loan instalments and total interest", h1: "EMI calculator", desc: "Compute the monthly instalment, total payment and total interest for a loan of any size, rate and tenure.", keywords: ["EMI calculator", "loan EMI", "home loan EMI calculator", "interest calculator"], tab: "EMI", intro: "The equated monthly instalment keeps payments constant while the interest share falls over time. Use it to compare borrowing against investing." },
  "inflation-calculator": { title: "Inflation calculator: purchasing power over time", h1: "Inflation calculator", desc: "See what today's rupees are worth after years of inflation, or how much you need to keep purchasing power.", keywords: ["inflation calculator India", "purchasing power calculator", "real return"], tab: "Inflation", intro: "Inflation erodes purchasing power; a return below inflation is a real loss. Compare nominal and real outcomes." },
  "risk-calculator": { title: "Risk calculator: position size and risk-reward", h1: "Risk calculator", desc: "Size a position from capital, risk per trade and stop distance, and compute the risk-reward ratio of a trade plan.", keywords: ["position size calculator", "risk reward calculator", "stop loss calculator", "risk per trade"], tab: "Position size", intro: "Decide how much to risk before deciding how much to buy. Quantity = capital × risk% ÷ distance to stop. Then check that the reward justifies the risk." },
  "options-payoff-calculator": { title: "Options payoff calculator and strategy builder", h1: "Options payoff calculator", desc: "Build multi-leg option strategies on a simulated chain: payoff at expiry, breakevens, max profit and loss, Greeks, margin estimate and scenario stress.", keywords: ["options payoff calculator", "options strategy builder India", "iron condor calculator", "straddle payoff", "options Greeks calculator"], intro: "Pick an underlying, a preset or your own legs; the chart shows profit and loss at expiry with breakevens, while the scenario sliders mark the position to model for spot, volatility and time changes. All prices are simulated and the model assumptions are stated below the chart." },
  "portfolio-analytics": { title: "Portfolio analytics", h1: "Portfolio analytics", desc: "XIRR, allocation, benchmark comparison and tax reports for your holdings inside the app.", keywords: ["portfolio analytics"], intro: "" },
  "market-replay": { title: "Market replay: replay simulated candles bar by bar", h1: "Market replay", desc: "Step through historical simulated candles one bar at a time to practise reading price action without seeing the future.", keywords: ["market replay", "bar replay trading practice", "chart replay tool"], intro: "" },
};

export function generateStaticParams() { return Object.keys(TOOLS).map((tool) => ({ tool })); }
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params; const t = TOOLS[tool]; if (!t) return {};
  return { title: t.title, description: t.desc, keywords: t.keywords, alternates: { canonical: `${SITE.url}/tools/${tool}` } };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params; const t = TOOLS[tool];
  if (!t) notFound();
  if (tool === "portfolio-analytics") redirect("/login?next=/app/portfolio");
  if (tool === "market-replay") redirect("/tools/replay");
  const spots: Record<string, number> = {};
  if (tool === "options-payoff-calculator") for (const q of await getQuotes()) spots[q.symbol] = Number(q.quote.ltp);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: `/tools/${tool}`, label: t.h1 }]} />
      <PageHero variant="calculators" intro={t.intro}><PageHeader eyebrow="Tools" title={t.h1} subtitle={t.desc} /></PageHero>
      <Notice tone="info">Formulas are shown with each result and unit-tested in the repository. Outputs are estimates for education, not advice.</Notice>
      <div className="mt-5">{tool === "options-payoff-calculator" ? <OptionsLab spots={spots} today={isoAgo(0)} /> : <Calculators initialTab={t.tab} />}</div>
    </div>
  );
}
