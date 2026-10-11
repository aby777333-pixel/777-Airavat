// Captures authentic showroom screenshots (see docs/SHOWROOM_CAPTURE.md).
// Public pages are captured from the deployed site; signed-in pages from a local run of the same release
// (http://localhost:3000) using the demo accounts in demo/demo-accounts.local.json (never committed).
// Usage: node demo/capture-showroom.mjs [--public-only]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const OUT = path.join(ROOT, "public", "showroom");
const DEPLOYED = process.env.SHOWROOM_PUBLIC_BASE || "https://777-airavat.netlify.app";
const LOCAL = process.env.SHOWROOM_LOCAL_BASE || "http://localhost:3000";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const publicOnly = process.argv.includes("--public-only");
fs.mkdirSync(OUT, { recursive: true });

const accounts = publicOnly ? [] : JSON.parse(fs.readFileSync(path.join(ROOT, "demo", "demo-accounts.local.json"), "utf8"));
const acct = (slug) => accounts.find((a) => a.slug === slug);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const log = (m) => console.log(new Date().toISOString().slice(11, 19), m);

async function shot(page, id, { fullPage = false } = {}) {
  await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
  const file = path.join(OUT, `${id}.jpg`);
  await page.screenshot({ path: file, type: "jpeg", quality: 85, fullPage });
  log(`saved ${id}.jpg`);
}
async function newPage(ctx, { mobile = false } = {}) {
  const page = await ctx.newPage();
  await page.setViewport(mobile ? { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900, deviceScaleFactor: 1 });
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(180000);
  // Skip the Awakening intro so captures show the page itself.
  await page.evaluateOnNewDocument(() => { try { sessionStorage.setItem("airavat-awakened", "1"); } catch {} });
  return page;
}
async function go(page, url) { await page.goto(url, { waitUntil: "networkidle2" }); }
async function login(ctx, slug) {
  const a = acct(slug); if (!a) throw new Error(`no account ${slug}`);
  const page = await newPage(ctx);
  await go(page, `${LOCAL}/login`);
  await page.type('input[name="email"]', a.email);
  await page.type('input[name="password"]', a.password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2" }), page.click('button[type="submit"], form button')]);
  log(`signed in as ${slug} → ${page.url()}`);
  return page;
}

try {
  // ---- Public pages from the deployed site ----
  const pub = await browser.createBrowserContext();
  let p = await newPage(pub);
  await go(p, `${DEPLOYED}/`); await shot(p, "home");
  await go(p, `${DEPLOYED}/markets/RELIANCE`); await shot(p, "instrument");
  await go(p, `${DEPLOYED}/calculators`); await shot(p, "calculators");
  await go(p, `${DEPLOYED}/briefing`); await shot(p, "briefing");
  await go(p, `${DEPLOYED}/markets/universe`); await shot(p, "universe");
  await p.close();
  p = await newPage(pub, { mobile: true });
  await go(p, `${DEPLOYED}/`); await shot(p, "mobile-home");
  await p.close(); await pub.close();

  if (!publicOnly) {
    // ---- Client surfaces (local run, demo client) ----
    const c = await browser.createBrowserContext();
    p = await login(c, "client1");
    await go(p, `${LOCAL}/app`); await shot(p, "dashboard");
    await go(p, `${LOCAL}/app/markets/RELIANCE`);
    await p.waitForSelector("text/Order ticket");
    await shot(p, "ticket");
    await go(p, `${LOCAL}/app/orders`);
    const orderHref = await p.$$eval('a[href^="/app/orders/"]', (as) => as.map((a) => a.getAttribute("href")).find((h) => /\/app\/orders\/[0-9a-f-]{36}$/.test(h)));
    if (orderHref) { await go(p, `${LOCAL}${orderHref}`); await shot(p, "passport"); }
    await go(p, `${LOCAL}/app/scanners`); await shot(p, "scanners");
    await go(p, `${LOCAL}/app/strategies`); await shot(p, "strategy");
    await go(p, `${LOCAL}/app/sentinel`); await shot(p, "sentinel");
    await go(p, `${LOCAL}/app/research`);
    const caseHref = await p.$$eval('a[href^="/app/research/"]', (as) => as.map((a) => a.getAttribute("href")).find((h) => /\/app\/research\/\d+$/.test(h)));
    if (caseHref) { await go(p, `${LOCAL}${caseHref}`); await shot(p, "detective"); }
    await p.close(); await c.close();

    // ---- Broker Core (local run, demo admin) ----
    const a = await browser.createBrowserContext();
    p = await login(a, "admin");
    await go(p, `${LOCAL}/admin`); await shot(p, "control-tower");
    await go(p, `${LOCAL}/admin/revenue`); await shot(p, "revenue");
    await p.close(); await a.close();
  }
} finally {
  await browser.close();
}
log("done");
