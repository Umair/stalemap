import assert from "node:assert/strict";
import { test } from "node:test";
import { renderForCrawler } from "../../src/crawler.tsx";
import { errorPageHtml } from "../../src/errorPage.ts";
import { ProductPage } from "../../src/ProductPage.tsx";

test("exports renderForCrawler, errorPageHtml and ProductPage", () => {
  assert.equal(typeof renderForCrawler, "function");
  assert.equal(typeof errorPageHtml, "string");
  assert.equal(typeof ProductPage, "function");
});
