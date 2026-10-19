import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { Article } = await load("../../src/models/article.ts");

test("a missing slug is derived from the title", async () => {
  const article = new Article({ title: "Hello, World: Mongoose Tips" });
  await article.validate();
  assert.equal(article.slug, "hello-world-mongoose-tips");
});

test("the slug is derived from a title set after creation", async () => {
  const article = new Article();
  article.title = "Release Notes 2026";
  await article.validate();
  assert.equal(article.slug, "release-notes-2026");
});

test("an explicit slug is kept", async () => {
  const article = new Article({ title: "Something Else", slug: "custom-slug" });
  await article.validate();
  assert.equal(article.slug, "custom-slug");
});

test("publishing without a body is rejected", async () => {
  await assert.rejects(new Article({ title: "Empty", status: "published" }).validate(), /A published article needs a body/);
  await new Article({ title: "Full", status: "published", body: "Text" }).validate();
  await new Article({ title: "Draft" }).validate();
});
