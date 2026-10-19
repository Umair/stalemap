import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../app/sitemap.ts";
import { categories, productsIn } from "../../src/catalog.ts";
const load = (id: string): Promise<any> => import(id);
test("one sitemap per category, called the way Next 16 calls it", async () => {
  const { resolveRouteData } = await load("next/dist/build/webpack/loaders/metadata/resolve-route-data.js");
  const m = mod as Record<string, any>;
  assert.equal(typeof m.generateSitemaps, "function", "generateSitemaps is exported");
  const ids: string[] = (await m.generateSitemaps()).map((s: { id: string | number }) => String(s.id));
  const expected = new Map<string, string>();
  for (const c of categories) expected.set(c, (await productsIn(c)).map((p) => `https://shop.example.com/products/${p.slug}`).sort().join(" "));
  const got: string[] = [];
  for (const id of ids) {
    // Next 16 hands the sitemap function its id as a promise (next-metadata-route-loader).
    const xml: string = resolveRouteData(await m.default({ id: Promise.resolve(id) }), "sitemap");
    got.push([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]).sort().join(" "));
  }
  assert.deepEqual(got.sort(), [...expected.values()].sort());
});
