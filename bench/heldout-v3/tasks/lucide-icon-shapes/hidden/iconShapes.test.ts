import assert from "node:assert/strict";
import { test } from "node:test";
import { Camera, House, Wifi, X, type LucideIcon } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const load = (id: string): Promise<any> => import(id);

/** The child elements lucide-react itself renders for an icon, as [tag, attributes]. */
function rendered(Icon: LucideIcon): [string, Record<string, string>][] {
  const inner = renderToStaticMarkup(createElement(Icon)).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  return [...inner.matchAll(/<([a-zA-Z]+)([^>]*?)\/?>/g)].map(([, tag, attrs]) => [
    tag,
    Object.fromEntries([...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v.replace(/&amp;/g, "&")])),
  ]);
}

const normalize = (shapes: unknown): [string, Record<string, string>][] => {
  assert.ok(Array.isArray(shapes), "iconShapes() resolves to an array");
  return shapes.map((shape: any) => {
    assert.ok(Array.isArray(shape) && typeof shape[0] === "string", "each shape is a [tag, attributes] pair");
    const attributes = Object.fromEntries(Object.entries(shape[1] ?? {}).filter(([k]) => k !== "key").map(([k, v]) => [k, String(v)]));
    return [shape[0], attributes];
  });
};

test("returns the elements each icon draws", async () => {
  const { iconShapes } = await load("../../src/iconShapes.ts");
  const icons: [string, LucideIcon][] = [["camera", Camera], ["x", X], ["house", House], ["wifi", Wifi]];
  for (const [name, Icon] of icons) {
    const expected = rendered(Icon);
    assert.ok(expected.length > 0);
    assert.deepEqual(normalize(await iconShapes(name)), expected, name);
  }
});
