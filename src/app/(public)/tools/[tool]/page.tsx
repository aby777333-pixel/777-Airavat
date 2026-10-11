import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Notice, PageHeader } from "@/components/ui";
import PageHero from "@/components/site/PageHero";
import { Breadcrumbs } from "@/components/site/ContentPageView";
import Calculators, { type Tab } from "../../calculators/Calculators";
import OptionsLab from "../OptionsLab";
import Planners, { type PlannerTab } from "../Planners";
import { getQuotes } from "@/lib/market";
import { SITE } from "@/lib/seo";
import { isoAgo } from "@/lib/time";

const TOOLS: Record<string, { title: string; h1: string; desc: string; keywords: string[]; tab?: Tab; planner?: PlannerTab; intro: string }> = {
  "brokerage-calculator": { title: "Brokerage calculator: exact charges for any NSE trade", h1: "Brokerage calculator", desc: "Calculate brokerage, STT, exchange charges, SEBI fee, stamp duty and GST for delivery and intraday trades, plus the break-even move.", keywords: ["brokerage calculator", "STT calculator", "intraday charges calculator", "delivery charges calculator", "break even calculator"], tab: "Brokerage", intro: "Enter quantity, buy and sell prices and the product; the calculator shows every charge line on both legs, total cost, net P&L and the break-even move per share. Switch to All segments for F&O, currency and commodity trades." },
  "margin-calculator": { title: "Margin calculator: intraday and delivery requirements", h1: "Margin calculator", desc: "Estimate the funds required for intraday (MIS) and delivery (CNC) orders using the sandbox margin policy.", keywords: ["margin calculator", "intraday margin", "MIS margin requirement", "leverage calculator"], tab: "Margin", intro: "Intraday margin is a percentage of order value set by the risk desk (20% in the sandbox); delivery requires full value plus charges. The result shows the amount the risk engine will hold." },
  "sip-calculator": { title: "SIP calculator: monthly investment growth", h1: "SIP calculator", desc: "Project the future value of a monthly SIP for a given expected return and period, with the formula shown.", keywords: ["SIP calculator", "mutual fund SIP returns", "monthly investment calculator"], tab: "SIP", intro: "A SIP invests a fixed amount every month. Future value compounds monthly; expected returns are assumptions, not promises." },
  "cagr-calculator": { title: "CAGR calculator: compound annual growth rate", h1: "CAGR calculator", desc: "Compute the annualised growth rate between a starting and ending value over a number of years.", keywords: ["CAGR calculator", "annualised return calculator", "compound growth"], tab: "CAGR", intro: "CAGR smooths a total return into an equivalent constant annual rate: (End ÷ Start)^(1/years) − 1." },
  "xirr-calculator": { title: "XIRR calculator: return on irregular cash flows", h1: "XIRR calculator", desc: "Compute the annualised return of investments and withdrawals made on different dates, the right measure for SIPs and portfolios.", keywords: ["XIRR calculator", "portfolio return calculator", "SIP XIRR", "irregular cash flow return"], tab: "XIRR", intro: "XIRR finds the single annual rate that makes the present value of all dated cash flows zero. It is the correct return measure when money goes in and out on different dates." },
  "emi-calculator": { title: "EMI calculator: loan instalments and total interest", h1: "EMI calculator", desc: "Compute the monthly instalment, total payment and total interest for a loan of any size, rate and tenure.", keywords: ["EMI calculator", "loan EMI", "home loan EMI calculator", "interest calculator"], tab: "EMI", intro: "The equated monthly instalment keeps payments constant while the interest share falls over time. Use it to compare borrowing against investing." },
  "inflation-calculator": { title: "Inflation calculator: purchasing power over time", h1: "Inflation calculator", desc: "See what today's rupees are worth after years of inflation, or how much you need to keep purchasing power.", keywords: ["inflation calculator India", "purchasing power calculator", "real return"], tab: "Inflation", intro: "Inflation erodes purchasing power; a return below inflation is a real loss. Compare nominal and real outcomes." },
  "risk-calculator": { title: "Risk calculator: position size and risk-reward", h1: "Risk calculator", desc: "Size a position from capital, risk per trade and stop distance, and compute the risk-reward ratio of a trade plan.", keywords: ["position size calculator", "risk reward calculator", "stop loss calculator", "risk per trade"], tab: "Position size", intro: "Decide how much to risk before deciding how much to buy. Quantity = capital × risk% ÷ distance to stop. Then check that the reward justifies the risk." },
  "options-payoff-calculator": { title: "Options payoff calculator and strategy builder", h1: "Options payoff calculator", desc: "Build multi-leg option strategies on a simulated chain: payoff at expiry, breakevens, max profit and loss, Greeks, margin estimate and scenario stress.", keywords: ["options payoff calculator", "options strategy builder India", "iron condor calculator", "straddle payoff", "options Greeks calculator"], intro: "Pick an underlying, a preset or your own legs; the chart shows profit and loss at expiry with breakevens, while the scenario sliders mark the position to model for spot, volatility and time changes. All prices are simulated and the model assumptions are stated below the chart." },
  "capital-gains-tax-calculator": { title: "Capital gains tax calculator: STCG and LTCG on listed shares and equity funds", h1: "Capital gains tax calculator", desc: "Estimate tax on short-term and long-term gains from listed equity and equity mutual funds with the annual LTCG exemption.", keywords: ["capital gains tax calculator", "LTCG tax", "STCG tax", "equity tax India"], planner: "Capital gains tax", intro: "Short-term gains on listed equity are taxed at a flat rate; long-term gains enjoy an annual exemption. This calculator applies both with illustrative rates." },
  "tax-harvesting-calculator": { title: "Tax harvesting calculator: use the LTCG exemption every year", h1: "Tax harvesting calculator", desc: "See how much long-term gain you can book tax-free this financial year and what it saves.", keywords: ["tax harvesting", "LTCG exemption", "book profits tax free"], planner: "Gain harvesting", intro: "Booking long-term gains up to the exemption each year, then rebuying, raises your cost base without tax. The calculator shows the room left." },
  "futures-margin-calculator": { title: "Futures margin calculator: SPAN plus exposure", h1: "Futures margin calculator", desc: "Estimate the upfront margin for an index or stock futures contract from SPAN and exposure percentages.", keywords: ["SPAN margin calculator", "futures margin", "exposure margin", "peak margin"], planner: "Futures margin", intro: "Exchanges collect SPAN and exposure margins upfront. Enter the contract value and the published percentages to see the requirement and leverage." },
  "pledge-calculator": { title: "Pledge haircut calculator: collateral margin from shares", h1: "Pledge haircut calculator", desc: "Collateral value after the haircut and the margin you can actually use under the 50% cash rule.", keywords: ["pledge calculator", "haircut", "collateral margin", "margin pledge"], planner: "Pledge haircut", intro: "Pledged shares count as collateral after a haircut, and at least half of the margin must be cash. The calculator shows what you can use." },
  "tax-saver-comparison": { title: "ELSS vs PPF vs NPS: Section 80C comparison", h1: "ELSS vs PPF vs NPS", desc: "Compare the three popular 80C options on lock-in, projected value and tax on exit.", keywords: ["ELSS vs PPF", "NPS vs PPF", "80C investment comparison", "tax saving investment"], planner: "80C: ELSS vs PPF vs NPS", intro: "All three save tax under 80C in the old regime; they differ in lock-in, risk and how the money is taxed when it comes out." },
  "retirement-calculator": { title: "Retirement corpus calculator for India", h1: "Retirement calculator", desc: "How much you need at retirement for an inflation-indexed income, and the monthly SIP to get there.", keywords: ["retirement calculator India", "retirement corpus", "how much to retire"], planner: "Retirement corpus", intro: "Inflation turns today's expenses into a much larger number by retirement. The calculator sizes the corpus and the SIP that reaches it." },
  "goal-planner": { title: "Goal planner: child education, wedding, house", h1: "Goal planner", desc: "Inflate a goal to its future cost and compute the monthly SIP that funds it.", keywords: ["child education calculator", "goal planner", "financial goal SIP"], planner: "Goal planner", intro: "Education and other goals inflate faster than CPI. Plan with the goal's own inflation rate." },
  "hra-calculator": { title: "HRA exemption calculator", h1: "HRA calculator", desc: "Compute the exempt part of house rent allowance under the old tax regime.", keywords: ["HRA calculator", "HRA exemption", "house rent allowance tax"], planner: "HRA exemption", intro: "Exempt HRA is the least of three amounts. Enter basic, HRA and rent to see the split." },
  "screener": { title: "Stock screener", h1: "Stock screener", desc: "Fundamental, technical and dividend filters.", keywords: ["stock screener"], intro: "" },
  "portfolio-analyser": { title: "Portfolio analyser", h1: "Portfolio analyser", desc: "Paste holdings for allocation, P&L, XIRR and overlap.", keywords: ["portfolio analyser"], intro: "" },
  "portfolio-analytics": { title: "Portfolio analytics", h1: "Portfolio analytics", desc: "XIRR, allocation, benchmark comparison and tax reports for your holdings inside the app.", keywords: ["portfolio analytics"], intro: "" },
  "market-replay": { title: "Market replay: replay simulated candles bar by bar", h1: "Market replay", desc: "Step through historical simulated candles one bar at a time to practise reading price action without seeing the future.", keywords: ["market replay", "bar replay trading practice", "chart replay tool"], intro: "" },
};

export function generateStaticParams() { return Object.keys(TOOLS).filter((t) => t !== "screener" && t !== "portfolio-analyser").map((tool) => ({ tool })); }
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params; const t = TOOLS[tool]; if (!t) return {};
  return { title: t.title, description: t.desc, keywords: t.keywords, alternates: { canonical: `${SITE.url}/tools/${tool}` } };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params; const t = TOOLS[tool];
  if (!t) notFound();
  if (tool === "portfolio-analytics") redirect("/login?next=/app/portfolio");
  if (tool === "market-replay") redirect("/tools/replay");
  if (tool === "screener") redirect("/tools/screener");
  if (tool === "portfolio-analyser") redirect("/tools/portfolio-analyser");
  const spots: Record<string, number> = {};
  if (tool === "options-payoff-calculator") for (const q of await getQuotes()) spots[q.symbol] = Number(q.quote.ltp);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/calculators", label: "Tools" }, { href: `/tools/${tool}`, label: t.h1 }]} />
      <PageHero variant="calculators" intro={t.intro}><PageHeader eyebrow="Tools" title={t.h1} subtitle={t.desc} /></PageHero>
      <Notice tone="info">Formulas are shown with each result and unit-tested in the repository. Outputs are estimates for education, not advice.</Notice>
      <div className="mt-5">{tool === "options-payoff-calculator" ? <OptionsLab spots={spots} today={isoAgo(0)} /> : t.planner ? <Planners initialTab={t.planner} /> : <Calculators initialTab={t.tab} />}</div>
    </div>
  );
}
