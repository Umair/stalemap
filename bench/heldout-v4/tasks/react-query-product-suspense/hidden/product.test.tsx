import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { JSDOM } from "jsdom";
const load = (id: string): Promise<any> => import(id);

const products: Record<string, { id: string; name: string; priceCents: number }> = {
  kettle: { id: "kettle", name: "Copper Kettle", priceCents: 4999 },
  mug: { id: "mug", name: "Stoneware Mug", priceCents: 1250 },
};
const requests: string[] = [];
let server: Server;

before(async () => {
  server = createServer((req, res) => {
    requests.push(req.url ?? "");
    const id = decodeURIComponent((req.url ?? "").replace(/^\/products\//, ""));
    const product = products[id];
    // Answer a little later, so the page has to wait for the product.
    setTimeout(() => {
      res.writeHead(product ? 200 : 404, { "content-type": "application/json" });
      res.end(JSON.stringify(product ?? { error: "not found" }));
    }, 30);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Node = dom.window.Node;
g.MutationObserver = dom.window.MutationObserver;
g.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
g.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Renders the page in the browser (jsdom) and returns the HTML seen at first and once the product shows. */
async function renderPage(id: string, expected: string): Promise<{ first: string; final: string }> {
  const { createRoot } = await load("react-dom/client");
  const { flushSync } = await load("react-dom");
  const { ProductPage } = await load("../../src/ProductPage.tsx");
  const { createQueryClient } = await load("../../src/queryClient.ts");
  const client = createQueryClient();
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(createElement(ProductPage, { client, id })));
  const first = container.innerHTML;
  for (let waited = 0; waited < 5000 && !container.innerHTML.includes(expected); waited += 20) await sleep(20);
  const final = container.innerHTML;
  root.unmount();
  container.remove();
  client.clear();
  return { first, final };
}

test("the product page waits for the product and shows it", async () => {
  requests.length = 0;
  const { first, final } = await renderPage("kettle", "Copper Kettle");
  assert.match(first, /Loading product/, "the page shows its loading fallback while the product loads");
  assert.match(final, /<h1>Copper Kettle<\/h1>/);
  assert.match(final, /\$49\.99/);
  assert.doesNotMatch(final, /Loading product/);
  assert.deepEqual(requests, ["/products/kettle"]);
});

test("each product page shows its own product", async () => {
  const { final } = await renderPage("mug", "Stoneware Mug");
  assert.match(final, /<h1>Stoneware Mug<\/h1>/);
  assert.match(final, /\$12\.50/);
});
