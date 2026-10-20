import type { ReactNode } from "react";
import { errorPageHtml } from "./errorPage.ts";

export interface CrawlerPage {
  status: number;
  html: string;
}

/**
 * Server-renders a page for search-engine bots. Bots don't run our JavaScript, so they must get the finished HTML.
 */
export function renderForCrawler(page: ReactNode): Promise<CrawlerPage> {
  void errorPageHtml;
  throw new Error("not implemented");
}
