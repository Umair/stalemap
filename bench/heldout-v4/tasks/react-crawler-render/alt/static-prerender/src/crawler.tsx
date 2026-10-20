import type { ReactNode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { errorPageHtml } from "./errorPage.ts";

export interface CrawlerPage {
  status: number;
  html: string;
}

/**
 * Server-renders a page for search-engine bots. Bots don't run our JavaScript, so they must get the finished HTML.
 */
export async function renderForCrawler(page: ReactNode): Promise<CrawlerPage> {
  let didError = false;
  try {
    const { prelude } = await prerenderToNodeStream(page, {
      onError() {
        didError = true;
      },
    });
    let html = "";
    for await (const chunk of prelude) html += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
    return didError ? { status: 500, html: errorPageHtml } : { status: 200, html };
  } catch {
    return { status: 500, html: errorPageHtml };
  }
}
