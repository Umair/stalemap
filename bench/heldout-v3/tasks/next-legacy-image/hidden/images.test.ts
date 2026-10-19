import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, register } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// next/image and friends are CommonJS modules with an `__esModule` default export. Give `import X from "next/..."`
// the component itself, as Next's bundler does, so components using them render under Node.
register("data:text/javascript," + encodeURIComponent(`
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
export async function load(url, context, nextLoad) {
  if (!/\\/node_modules\\/next\\/(?:legacy\\/)?[a-z-]+\\.js$/.test(url)) return nextLoad(url, context);
  const file = fileURLToPath(url);
  const mod = createRequire(file)(file);
  if (!mod || !mod.__esModule || !("default" in mod)) return nextLoad(url, context);
  const names = Object.keys(mod).filter((k) => k !== "default" && /^[A-Za-z_$][\\w$]*$/.test(k));
  const source = "import { createRequire } from 'node:module'; const mod = createRequire(" + JSON.stringify(file) + ")(" + JSON.stringify(file) + "); export default mod.default; " + names.map((n) => "export const " + n + " = mod." + n + ";").join(" ");
  return { format: "module", source, shortCircuit: true };
}`));
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));

/** Renders `element` as Next does, inside the app's image config, and collects what Next logs meanwhile. */
async function render(file: string, name: string, props: Record<string, unknown>) {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  // Next's require hook (installed by loadConfig) may point component code at the vendored contexts; provide both.
  const contexts = [
    req("next/dist/shared/lib/image-config-context.shared-runtime.js").ImageConfigContext,
    req("next/dist/server/route-modules/pages/vendored/contexts/image-config-context.js").ImageConfigContext,
  ];
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log, emitWarning: process.emitWarning };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  process.emitWarning = ((warning: unknown) => void messages.push(String(warning))) as typeof process.emitWarning;
  try {
    const mod = await load(`../../app/components/${file}`);
    const tree = contexts.reduce((children, context) => createElement(context.Provider, { value: config.images }, children), createElement(mod[name], props));
    const html = renderToStaticMarkup(tree);
    return { html, deprecations: messages.filter((m) => /deprecat|legacy prop/i.test(m)) };
  } finally {
    Object.assign(console, { warn: original.warn, error: original.error, log: original.log });
    process.emitWarning = original.emitWarning;
  }
}

const imgTag = (html: string, alt: string) => {
  const m = html.match(new RegExp(`<img[^>]*alt="${alt}"[^>]*>`));
  assert.ok(m, `renders an <img> for "${alt}"`);
  return { tag: m[0], before: html.slice(0, m.index), style: (m[0].match(/style="([^"]*)"/)?.[1] ?? "").replace(/\s+/g, "") };
};

test("the hero photo fills its banner, cropped to cover it, without deprecated APIs", async () => {
  const { html, deprecations } = await render("HeroBanner.tsx", "HeroBanner", { src: "https://cdn.example.com/hero/autumn.jpg", alt: "Knitwear", title: "Autumn" });
  assert.deepEqual(deprecations, [], "Next logs no deprecation warnings");
  const img = imgTag(html, "Knitwear");
  assert.match(img.style, /object-fit:cover/, "cropped to cover");
  assert.match(img.style, /position:absolute/, "fills the banner");
  assert.match(img.before, /position:relative/, "inside the positioned banner");
  assert.match(html, /Autumn<\/h1>/);
  assert.match(img.tag, /cdn\.example\.com%2Fhero%2Fautumn\.jpg/, "served through the image optimizer");
});

test("product photos keep their 4:3 shape and scale to their column, without deprecated APIs", async () => {
  const { html, deprecations } = await render("ProductPhoto.tsx", "ProductPhoto", { src: "https://cdn.example.com/products/scarf.jpg", alt: "Wool scarf" });
  assert.deepEqual(deprecations, [], "Next logs no deprecation warnings");
  const img = imgTag(html, "Wool scarf");
  const container = img.before.replace(/\s+/g, "");
  const intrinsic = /\bwidth="800"/.test(img.tag) && /\bheight="600"/.test(img.tag) && /width:100%/.test(img.style) && /height:auto/.test(img.style);
  const boxed = /aspect-ratio:(?:4\/3|1\.333)/.test(container) && /position:absolute/.test(img.style) && /width:100%/.test(img.style) && /height:100%/.test(img.style);
  const padded = /padding-top:75%/.test(container);
  assert.ok(intrinsic || boxed || padded, `the photo is 4:3 and as wide as its column (${img.tag})`);
  assert.match(img.tag, /cdn\.example\.com%2Fproducts%2Fscarf\.jpg/, "served through the image optimizer");
});
