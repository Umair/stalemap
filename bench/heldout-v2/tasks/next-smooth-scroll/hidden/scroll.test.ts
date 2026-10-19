import assert from "node:assert/strict";
import { test } from "node:test";
import { register } from "node:module";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// Node can't import stylesheets; stub them so the layout renders.
register("data:text/javascript," + encodeURIComponent(`export async function load(url, context, nextLoad) { return url.endsWith(".css") ? { format: "module", source: "", shortCircuit: true } : nextLoad(url, context); }`));
const root = fileURLToPath(new URL("../../", import.meta.url));
/** Every stylesheet in the project, wherever it lives. */
function css(dir: string): string {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => !["node_modules", ".git", ".next", "test"].includes(e.name))
    .map((e) => (e.isDirectory() ? css(join(dir, e.name)) : e.name.endsWith(".css") ? readFileSync(join(dir, e.name), "utf8") : ""))
    .join("\n");
}
test("smooth in-page scrolling, instant route changes", async () => {
  const layout = (await import(new URL("../../app/layout.tsx", import.meta.url).href)) as { default: (props: { children: unknown }) => unknown };
  const html = renderToStaticMarkup(createElement(layout.default as any, { children: createElement("main") }));
  const htmlTag = html.match(/<html[^>]*>/)?.[0] ?? "";
  const smooth = /scroll-behavior\s*:\s*smooth/;
  assert.ok(smooth.test(css(root)) || smooth.test(htmlTag), "smooth scrolling is turned on");
  // Next 16 only turns smooth scrolling off during route changes when <html> opts in.
  assert.match(htmlTag, /data-scroll-behavior="smooth"/);
});
