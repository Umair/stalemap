import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
const g = globalThis as any;
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "Event", "MouseEvent", "Text", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(g, key, { value: (dom.window as any)[key], configurable: true, writable: true });
}
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });

const load = (id: string): Promise<any> => import(id);
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** A CSS/SVG opacity value ("0.5", "50%"), or 1 when absent or invalid (an invalid value is ignored by the browser). */
function opacity(value: string | null | undefined): number {
  if (value == null || value.trim() === "") return 1;
  const v = value.trim();
  const m = /^(-?\d*\.?\d+(?:e-?\d+)?)(%?)$/i.exec(v);
  if (!m) return 1;
  const n = Number(m[1]) / (m[2] ? 100 : 1);
  return Math.min(1, Math.max(0, n));
}

/** The alpha channel of a fill colour (rgba(), hsla(), rgb(r g b / a), #rgba, #rrggbbaa), or 1. */
function colorAlpha(color: string | null | undefined): number {
  if (!color) return 1;
  const c = color.trim().toLowerCase();
  const fn = /^(?:rgb|hsl)a?\((.*)\)$/.exec(c);
  if (fn) {
    const parts = fn[1].includes("/") ? [fn[1].split("/")[1]] : fn[1].split(",").slice(3);
    return parts.length ? opacity(parts[0]) : 1;
  }
  const hex = /^#([0-9a-f]{4}|[0-9a-f]{8})$/.exec(c);
  if (hex) {
    const a = hex[1].length === 4 ? hex[1][3].repeat(2) : hex[1].slice(6);
    return parseInt(a, 16) / 255;
  }
  return 1;
}

/** How opaque the square's fill is on screen, from every place an SVG rect can set it. */
function effectiveFillOpacity(rect: Element): number {
  const style = (rect as any).style as CSSStyleDeclaration;
  const fillOpacity = style.getPropertyValue("fill-opacity") || rect.getAttribute("fill-opacity");
  const elementOpacity = style.getPropertyValue("opacity") || rect.getAttribute("opacity");
  const fill = style.getPropertyValue("fill") || rect.getAttribute("fill");
  return opacity(fillOpacity) * opacity(elementOpacity) * colorAlpha(fill);
}

const days = [
  { date: "2026-10-04", commits: 0 },
  { date: "2026-10-05", commits: 8 },
  { date: "2026-10-06", commits: 4 },
  { date: "2026-10-07", commits: 2 },
  { date: "2026-10-08", commits: 1 },
  { date: "2026-10-09", commits: 6 },
  { date: "2026-10-10", commits: 0 },
  { date: "2026-10-11", commits: 3 },
];

test("each day's square is faded by commits / busiest day, never below 0.1", async () => {
  await load("preact/compat");
  const { mountHeatmap } = await load("../../src/main.tsx");
  const container = document.createElement("div");
  document.body.appendChild(container);
  mountHeatmap(container, days);
  await settle();

  for (const day of days) {
    const rect = container.querySelector(`rect[data-date="${day.date}"]`);
    assert.ok(rect, `a square for ${day.date}`);
    const expected = Math.max(0.1, day.commits / 8);
    const actual = effectiveFillOpacity(rect);
    assert.ok(Math.abs(actual - expected) < 0.011, `${day.date} (${day.commits} commits): expected opacity ${expected}, got ${actual} (${rect.outerHTML})`);
  }
});
