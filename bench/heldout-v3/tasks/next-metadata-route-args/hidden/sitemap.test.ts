import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));

/** Compiles app/sitemap.ts into its route module with Next's own metadata route loader, as `next build` does. */
async function buildRoute(file: string) {
  const loader = req("next/dist/build/webpack/loaders/next-metadata-route-loader.js").default;
  const userland = await load(pathToFileURL(file).href);
  // The loader asks webpack for the module's named exports; answer with the real ones.
  const exportNames = Object.keys(userland).filter((name) => name !== "default");
  const dependency = (name: string) => Object.assign(Object.create({ constructor: { name: "HarmonyExportSpecifierDependency" } }), { name });
  const context = {
    getOptions: () => ({ isDynamicRouteExtension: "1", filePath: file }),
    addDependency: () => {},
    loadModule: (_path: string, done: (...args: unknown[]) => void) => done(null, "", null, { dependencies: exportNames.map(dependency) }),
  };
  let code: string = await loader.call(context);
  for (const spec of ["next/server", "next/dist/build/webpack/loaders/metadata/resolve-route-data"]) {
    code = code.split(`'${spec}'`).join(JSON.stringify(pathToFileURL(req.resolve(spec)).href));
  }
  code = code.split(JSON.stringify(file)).join(JSON.stringify(pathToFileURL(file).href));
  const out = join(await mkdtemp(join(tmpdir(), "sitemap-route-")), "route.mjs");
  await writeFile(out, code);
  return load(pathToFileURL(out).href);
}

test("every product is listed in exactly one sitemap of at most 1,000 URLs", async () => {
  const { countProducts, listProducts } = await load("../../src/lib/catalog.ts");
  const expected: string[] = (await listProducts(0, await countProducts())).map((p: { slug: string }) => `https://shop.example.com/products/${p.slug}`);
  const route = await buildRoute(join(root, "app", "sitemap.ts"));
  assert.equal(typeof route.generateStaticParams, "function", "the sitemap is split into several sitemaps");
  const sitemaps: { __metadata_id__: string }[] = await route.generateStaticParams();
  assert.ok(sitemaps.length >= 3, `2,345 products need at least 3 sitemaps (got ${sitemaps.length})`);
  const seen: string[] = [];
  for (const params of sitemaps) {
    const res: Response = await route.GET(new Request(`https://shop.example.com/sitemap/${params.__metadata_id__}`), { params: Promise.resolve(params) });
    assert.equal(res.status, 200, `/sitemap/${params.__metadata_id__} is served`);
    const urls = [...(await res.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    assert.ok(urls.length > 0, `/sitemap/${params.__metadata_id__} lists products`);
    assert.ok(urls.length <= 1000, `/sitemap/${params.__metadata_id__} lists ${urls.length} URLs`);
    seen.push(...urls);
  }
  assert.equal(new Set(seen).size, seen.length, "no product is listed twice");
  assert.deepEqual([...seen].sort(), [...expected].sort(), "every product is listed");
});
