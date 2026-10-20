import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";

const load = (id: string): Promise<any> => import(id);
const { errorPageHtml } = await load("../../src/errorPage.ts");

/** Fails instead of hanging when the promise never settles. */
function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what} never settled (waited ${ms} ms)`)), ms);
    }),
  ]);
}

const quiet = async <T>(fn: () => Promise<T>): Promise<T> => {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
};

test("resolves with 200 and the complete HTML, including suspended content", async () => {
  const { renderForCrawler } = await load("../../src/crawler.tsx");
  const { ProductPage } = await load("../../src/ProductPage.tsx");
  const product = new Promise((resolve) => setTimeout(() => resolve({ name: "Trail Runner 3", description: "Grippy soles for wet rock." }), 50));
  const page: any = await within(renderForCrawler(createElement(ProductPage, { product })), 5000, "renderForCrawler");
  assert.equal(page.status, 200);
  assert.match(page.html, /<h1>Trail Runner 3<\/h1>/);
  assert.match(page.html, /Grippy soles for wet rock\./);
  assert.match(page.html, /<nav>Shop<\/nav>/);
});

test("resolves with 500 and the error page when the page throws outside any Suspense boundary", async () => {
  const { renderForCrawler } = await load("../../src/crawler.tsx");
  function Header(): never {
    throw new Error("navigation service unavailable");
  }
  const element = createElement("html", null, createElement("body", null, createElement(Header), createElement("main", null, "Hello")));
  const page: any = await quiet(() => within(renderForCrawler(element), 5000, "renderForCrawler for a page whose shell throws"));
  assert.equal(page.status, 500);
  assert.equal(page.html, errorPageHtml);
});
