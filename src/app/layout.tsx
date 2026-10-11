import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://777-airavat.netlify.app";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "AIRAVAT · Independent Indian stock broker and trading platform (sandbox)", template: "%s · AIRAVAT" },
  description:
    "AIRAVAT is an independent Indian stock broking and trading technology platform: zero delivery brokerage schedule, fail-closed risk engine, double-entry ledger, research tools and an explainable AI assistant. Sandbox with simulated data.",
  keywords: ["Indian stock broker", "online trading platform India", "demat account", "zero brokerage", "NSE trading app", "F&O trading", "mutual funds SIP", "IPO", "stock research tools"],
  applicationName: "AIRAVAT",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "AIRAVAT" },
  robots: { index: true, follow: true },
  openGraph: { title: "AIRAVAT", description: "Power with precision. An independent Indian stock broker and trading platform, built in the open (sandbox).", type: "website", siteName: "AIRAVAT", url: SITE_URL },
  twitter: { card: "summary_large_image", title: "AIRAVAT", description: "Independent Indian stock broker technology, built in the open (sandbox)." },
};
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", name: "AIRAVAT", url: SITE_URL, description: "Independent Indian stock broking and trading technology platform in sandbox development. No SEBI registration or exchange membership is claimed.", logo: `${SITE_URL}/showroom/home.jpg`, areaServed: "IN" },
    { "@type": "WebSite", name: "AIRAVAT", url: SITE_URL, potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/markets/watch?q={search_term_string}`, "query-input": "required name=search_term_string" } },
  ],
};

export const viewport: Viewport = { themeColor: "#070c1c", width: "device-width", initialScale: 1 };

const themeInit = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('airavat-theme');if(t){d.setAttribute('data-theme',t);}['material','motion','density'].forEach(function(k){var v=localStorage.getItem('airavat-'+k);if(v){d.setAttribute('data-'+k,v);}});}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="midnight-sovereign" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>{children}<PwaRegister /></body>
    </html>
  );
}
