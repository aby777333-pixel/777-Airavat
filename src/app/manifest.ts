import type { MetadataRoute } from "next";

// Web app manifest: installable PWA shell. Market data and account pages are always fetched live (see public/sw.js).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AIRAVAT · Independent Indian stock broker (sandbox)",
    short_name: "AIRAVAT",
    description: "Invest, trade and research on an independent Indian brokerage platform. Sandbox with simulated data.",
    id: "/",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070c1c",
    theme_color: "#070c1c",
    lang: "en-IN",
    categories: ["finance", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Market watch", url: "/app/markets", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Orders", url: "/app/orders", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Portfolio", url: "/app/portfolio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Terminal X", url: "/app/pro", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
