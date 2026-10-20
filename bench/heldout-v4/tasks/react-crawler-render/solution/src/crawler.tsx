import type { ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { errorPageHtml } from "./errorPage.ts";

export interface CrawlerPage {
  status: number;
  html: string;
}

/**
 * Server-renders a page for search-engine bots. Bots don't run our JavaScript, so they must get the finished HTML.
 */
export function renderForCrawler(page: ReactNode): Promise<CrawlerPage> {
  return new Promise((resolve) => {
    let didError = false;
    const stream = renderToPipeableStream(page, {
      onError(error) {
        didError = true;
        console.error(error);
      },
      // If the shell fails, onAllReady is never called, so answer here.
      onShellError() {
        resolve({ status: 500, html: errorPageHtml });
      },
      onAllReady() {
        if (didError) {
          resolve({ status: 500, html: errorPageHtml });
          return;
        }
        const chunks: Buffer[] = [];
        const sink = new Writable({
          write(chunk, _encoding, done) {
            chunks.push(Buffer.from(chunk));
            done();
          },
          final(done) {
            resolve({ status: 200, html: Buffer.concat(chunks).toString("utf8") });
            done();
          },
        });
        stream.pipe(sink);
      },
    });
  });
}
