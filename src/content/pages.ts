import type { ContentPage } from "./types";
import { INVEST_TRADE } from "./pages-invest-trade";
import { MORE_PAGES } from "./pages-more";
import { ACCOUNT_PAGES } from "./pages-account";
import { PLATFORM_PAGES } from "./pages-platforms";
import { COMPANY_PAGES } from "./pages-company";

export const CONTENT_PAGES: ContentPage[] = [...INVEST_TRADE, ...MORE_PAGES, ...ACCOUNT_PAGES, ...PLATFORM_PAGES, ...COMPANY_PAGES];
export const CONTENT_BY_PATH = new Map(CONTENT_PAGES.map((p) => [p.path, p]));
export function contentPage(path: string) { return CONTENT_BY_PATH.get(path) ?? null; }
export type { ContentPage } from "./types";
