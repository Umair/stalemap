import type { ReactNode } from "react";
import { renderToReadableStream } from "react-dom/server";
import { errorPageHtml } from "./errorPage.ts";

export interface CrawlerPage {
  status: number;
  html: string;
}

const failed = (): CrawlerPage => ({ status: 500, html: errorPageHtml });

/**
 * Server-renders a page for search-engine bots. Bots don't run our JavaScript, so they must get the finished HTML.
 */
export async function renderForCrawler(page: ReactNode): Promise<CrawlerPage> {
  let didError = false;
  let stream: Awaited<ReturnType<typeof renderToReadableStream>>;
  try {
    stream = await renderToReadableStream(page, {
      onError() {
        didError = true;
      },
    });
  } catch {
    return failed();
  }
  await stream.allReady;
  if (didError) return failed();
  return { status: 200, html: await new Response(stream).text() };
}
