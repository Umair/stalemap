import assert from "node:assert/strict";
import { test } from "node:test";
import ArticlePage, { getStaticProps } from "../../src/pages/articles/[slug].tsx";
test("the article page exports a component and getStaticProps", () => {
  assert.equal(typeof ArticlePage, "function");
  assert.equal(typeof getStaticProps, "function");
});
