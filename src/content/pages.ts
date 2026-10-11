import type { ContentPage } from "./types";
import { INVEST_TRADE } from "./pages-invest-trade";
import { MORE_PAGES } from "./pages-more";

export const CONTENT_PAGES: ContentPage[] = [...INVEST_TRADE, ...MORE_PAGES];
export const CONTENT_BY_PATH = new Map(CONTENT_PAGES.map((p) => [p.path, p]));
export function contentPage(path: string) { return CONTENT_BY_PATH.get(path) ?? null; }
export type { ContentPage } from "./types";
