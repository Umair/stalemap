import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire, register } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// next/image is a CommonJS module with an `__esModule` default export. Give `import X from "next/image"`
// the component itself, as Next's bundler does, so components using it render under Node.
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
const req = createRequire(join(root, "package.json"));

async function loadNextConfig() {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  return loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
}

/** Renders a component inside the app's image config, as Next does, and collects what Next logs meanwhile. */
async function render(config: any, file: string, name: string, props: Record<string, unknown>) {
  // Next's require hook (installed by loadConfig) may point component code at the vendored contexts; provide both.
  const contexts = [
    req("next/dist/shared/lib/image-config-context.shared-runtime.js").ImageConfigContext,
    req("next/dist/server/route-modules/pages/vendored/contexts/image-config-context.js").ImageConfigContext,
  ];
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  try {
    const mod = await load(`../../app/components/${file}`);
    const tree = contexts.reduce((children, context) => createElement(context.Provider, { value: config.images }, children), createElement(mod[name], props));
    return { html: renderToStaticMarkup(tree), messages };
  } finally {
    Object.assign(console, original);
  }
}

/** The `q` of every optimizer URL in the rendered <img> (src and srcset). */
function qualities(html: string, alt: string): string[] {
  const tag = html.match(new RegExp(`<img[^>]*alt="${alt}"[^>]*>`))?.[0];
  assert.ok(tag, `renders an <img> for "${alt}"`);
  const urls = [...tag.replaceAll("&amp;", "&").matchAll(/\/_next\/image\?[^\s",]+/g)].map((m) => m[0]);
  assert.ok(urls.length > 0, `"${alt}" is served through the image optimizer (${tag})`);
  return urls.map((u) => new URLSearchParams(u.slice(u.indexOf("?") + 1)).get("q") ?? "");
}

test("product photos are served at quality 90, other images at the default", async () => {
  const config = await loadNextConfig();
  const photo = await render(config, "ProductPhoto.tsx", "ProductPhoto", { src: "https://cdn.example.com/products/lamp.jpg", alt: "Brass desk lamp" });
  assert.deepEqual(photo.messages.filter((m) => /qualit/i.test(m)), [], "Next logs no warning about the image quality");
  for (const q of qualities(photo.html, "Brass desk lamp")) assert.equal(q, "90", "every product photo URL asks for quality 90");
  const avatar = await render(config, "Avatar.tsx", "Avatar", { src: "https://cdn.example.com/people/ada.jpg", name: "Ada" });
  for (const q of qualities(avatar.html, "Ada")) assert.equal(q, "75", "other images keep the default quality");
});

test("the image optimizer accepts those requests", async () => {
  const config = await loadNextConfig();
  const { ImageOptimizerCache } = await load("next/dist/server/image-optimizer.js");
  const request = (url: string, q: number): string | undefined =>
    ImageOptimizerCache.validateParams({ headers: { accept: "image/webp" } }, { url, w: "1200", q: String(q) }, config, false).errorMessage;
  assert.equal(request("https://cdn.example.com/products/lamp.jpg", 90), undefined, "product photo at quality 90");
  assert.equal(request("https://cdn.example.com/people/ada.jpg", 75), undefined, "avatar at the default quality");
});
