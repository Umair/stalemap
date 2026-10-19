import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, register } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// next/image, next/link etc. are CommonJS modules with an `__esModule` default export. Give `import X from "next/..."`
// the component itself, as Next's bundler does, so pages using them render under Node.
register("data:text/javascript," + encodeURIComponent(`
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
export async function load(url, context, nextLoad) {
  if (!/\\/node_modules\\/next\\/[a-z-]+\\.js$/.test(url)) return nextLoad(url, context);
  const file = fileURLToPath(url);
  const mod = createRequire(file)(file);
  if (!mod || !mod.__esModule || !("default" in mod)) return nextLoad(url, context);
  const names = Object.keys(mod).filter((k) => k !== "default" && /^[A-Za-z_$][\\w$]*$/.test(k));
  const source = "import { createRequire } from 'node:module'; const mod = createRequire(" + JSON.stringify(file) + ")(" + JSON.stringify(file) + "); export default mod.default; " + names.map((n) => "export const " + n + " = mod." + n + ";").join(" ");
  return { format: "module", source, shortCircuit: true };
}`));
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

/** Renders the page the way Next's pages renderer does: getStaticProps, then the component inside the image config. */
async function renderArticle(slug: string) {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  // Next's require hook (installed by loadConfig) points pages code at the vendored contexts; provide both.
  const req = createRequire(join(root, "package.json"));
  const contexts = [
    req("next/dist/shared/lib/image-config-context.shared-runtime.js").ImageConfigContext,
    req("next/dist/server/route-modules/pages/vendored/contexts/image-config-context.js").ImageConfigContext,
  ];
  const page = await load("../../src/pages/articles/[slug].tsx");
  const paths = await page.getStaticPaths({});
  assert.ok(paths.paths.some((p: any) => (typeof p === "string" ? p.endsWith(`/${slug}`) : p.params.slug === slug)), `${slug} is prerendered`);
  const result = await page.getStaticProps({ params: { slug } });
  assert.ok(result && "props" in result, `${slug} has props`);
  const tree = contexts.reduce((children, context) => createElement(context.Provider, { value: config.images }, children), createElement(page.default, result.props));
  return renderToStaticMarkup(tree);
}

test("the article page renders for readers as on Next 15", async () => {
  const html = await renderArticle("lighthouse-keepers");
  assert.match(html, /<h1>The last lighthouse keepers<\/h1>/);
  assert.match(html, /By (<!-- -->)?Maya Lin/);
  assert.match(html, /<img[^>]*alt="Lighthouse at dusk"/, "the photo is a regular image");
  assert.doesNotMatch(html, /<amp-/, "no AMP-only elements");
  assert.match(html, /<form[^>]*>[\s\S]*<textarea[\s\S]*<\/form>/, "the comment form is shown");
  assert.match(html, /We spent a week with the people who run them\./);
});

test("unknown articles are not found", async () => {
  const page = await load("../../src/pages/articles/[slug].tsx");
  const result = await page.getStaticProps({ params: { slug: "nope" } });
  assert.equal(result.notFound, true);
});
