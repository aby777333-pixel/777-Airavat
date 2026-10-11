import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "AIRAVAT — Indian markets, engineered with precision", template: "%s · AIRAVAT" },
  description:
    "AIRAVAT is an independent Indian brokerage technology platform in sandbox development: simulated trading, transparent risk controls, double-entry ledger and an explainable AI assistant.",
  applicationName: "AIRAVAT",
  robots: { index: true, follow: true },
  openGraph: { title: "AIRAVAT", description: "Power with precision. Indian brokerage technology, built in the open (sandbox).", type: "website" },
};

export const viewport: Viewport = { themeColor: "#070c1c", width: "device-width", initialScale: 1 };

const themeInit = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('airavat-theme');if(t){d.setAttribute('data-theme',t);}['material','motion','density'].forEach(function(k){var v=localStorage.getItem('airavat-'+k);if(v){d.setAttribute('data-'+k,v);}});}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="midnight-sovereign" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${inter.variable} ${manrope.variable} font-sans`}>{children}</body>
    </html>
  );
}
