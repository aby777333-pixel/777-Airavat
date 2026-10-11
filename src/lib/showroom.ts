// Registry of authentic screenshots captured from the deployed sandbox (see docs/SHOWROOM_CAPTURE.md).
// A module without a capture is listed as pending; the gallery never fabricates an image.
export type ShowroomItem = { id: string; module: string; title: string; caption: string; src?: string; device: "desktop" | "mobile"; capturedAt?: string; href?: string; pending?: string };

export const SHOWROOM: ShowroomItem[] = [
  { id: "home", module: "Public website", title: "Cinematic homepage", caption: "Market pulse with simulated indices, gainers and losers; product family; honest session status.", src: "/showroom/home.jpg", device: "desktop", capturedAt: "2026-10-11", href: "/" },
  { id: "instrument", module: "Markets", title: "Instrument page with synthetic daily candles", caption: "Quote card, price band, lot and tick size; chart rendered with lightweight-charts.", src: "/showroom/instrument.jpg", device: "desktop", capturedAt: "2026-10-11", href: "/markets/RELIANCE" },
  { id: "calculators", module: "Tools", title: "Financial calculators", caption: "Brokerage breakdown by charge line, SIP, lumpsum, CAGR, position size, risk/reward, margin, inflation.", src: "/showroom/calculators.jpg", device: "desktop", capturedAt: "2026-10-11", href: "/calculators" },
  { id: "dashboard", module: "AIRAVAT ONE", title: "Client dashboard", caption: "Funds, holdings value, day P&L, watchlist and recent orders for a sandbox client.", src: "/showroom/dashboard.jpg", device: "desktop", href: "/app" },
  { id: "ticket", module: "AIRAVAT ONE", title: "Order ticket with risk preview and pre-mortem", caption: "Margin required, estimated charges from RevenueOS, Sentinel pre-mortem checks before confirmation.", src: "/showroom/ticket.jpg", device: "desktop", href: "/app/markets/RELIANCE" },
  { id: "passport", module: "CLEARVIEW", title: "Order passport", caption: "Lifecycle events, RMS checks, executions with every charge line and the double-entry journal lines.", src: "/showroom/passport.jpg", device: "desktop", href: "/app/orders" },
  { id: "scanners", module: "Scanner Matrix", title: "Scanner pulse wall and builder", caption: "System scanner matches with recorded conditions and a no-code builder for custom scans.", src: "/showroom/scanners.jpg", device: "desktop", href: "/app/scanners" },
  { id: "strategy", module: "Strategy DNA", title: "Backtest, fingerprint and robustness", caption: "Metrics, explained fingerprint measures and ±20% parameter perturbation on simulated candles.", src: "/showroom/strategy.jpg", device: "desktop", href: "/app/strategies" },
  { id: "sentinel", module: "Sentinel X", title: "Alert console and trade health", caption: "Explainable warnings with evidence, acknowledgement and user thresholds.", src: "/showroom/sentinel.jpg", device: "desktop", href: "/app/sentinel" },
  { id: "control", module: "Broker Core", title: "Control tower", caption: "Clients, KYC queue, orders, payouts pending, ledger integrity, feed health and risk status.", src: "/showroom/control-tower.jpg", device: "desktop", href: "/admin" },
  { id: "revenue", module: "RevenueOS", title: "Fee command console", caption: "Versioned fee catalogue, pricing plans, waivers, offers and approvals with maker-checker.", src: "/showroom/revenue.jpg", device: "desktop", href: "/admin/revenue" },
  { id: "mobile", module: "Mobile web", title: "Homepage on a phone", caption: "Responsive layout at 375px width.", src: "/showroom/mobile-home.jpg", device: "mobile", href: "/" },
  { id: "pro", module: "AIRAVAT PRO", title: "Professional terminal", caption: "Multi-panel terminal.", device: "desktop", pending: "Not built yet; no screenshot will be shown until it exists." },
  { id: "detective", module: "Market Detective", title: "Evidence board and AI Research Council", caption: "Case evidence board with bull/bear/neutral/auditor findings.", src: "/showroom/detective.jpg", device: "desktop", href: "/app/research" },
];
