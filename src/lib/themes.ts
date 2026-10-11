// Theme registry shared by server and client components (kept out of the client module so server pages can read it).
export const THEMES: { id: string; name: string; family: string }[] = [
  { id: "airavat-house", name: "Default (paper & night)", family: "signature" },
  { id: "midnight-sovereign", name: "Midnight Sovereign", family: "signature" },
  { id: "royal-sapphire", name: "Royal Sapphire", family: "signature" },
  { id: "ivory-reserve", name: "Ivory Reserve", family: "light" },
  { id: "arctic-frost", name: "Arctic Frost", family: "light" },
  { id: "champagne-ivory", name: "Champagne Ivory", family: "light" },
  { id: "obsidian-terminal", name: "Obsidian Terminal", family: "terminal" },
  { id: "obsidian-chrome", name: "Obsidian Chrome", family: "terminal" },
  { id: "graphite-carbon", name: "Graphite Carbon", family: "terminal" },
  { id: "electric-cobalt", name: "Electric Cobalt", family: "terminal" },
  { id: "emerald-exchange", name: "Emerald Exchange", family: "research" },
  { id: "emerald-titanium", name: "Emerald Titanium", family: "research" },
  { id: "midnight-aurora", name: "Midnight Aurora", family: "research" },
  { id: "imperial-burgundy", name: "Imperial Burgundy", family: "editorial" },
  { id: "copper-nebula", name: "Copper Nebula", family: "markets" },
  { id: "high-contrast", name: "High Contrast", family: "accessible" },
];
