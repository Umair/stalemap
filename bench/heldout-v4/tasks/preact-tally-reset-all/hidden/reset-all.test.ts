import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
const g = globalThis as any;
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "Event", "MouseEvent", "Text", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(g, key, { value: (dom.window as any)[key], configurable: true, writable: true });
}
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });

const load = (id: string): Promise<any> => import(id);
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("Reset all zeroes every gate's counter, and each counter still works on its own", async () => {
  const { h, render } = await load("preact");
  const { Dashboard } = await load("../../src/Dashboard.tsx");
  const container = document.createElement("div");
  document.body.appendChild(container);
  render(h(Dashboard, {}), container);
  await settle();

  const counters = () => [...container.querySelectorAll("section")].filter((s) => s.querySelector("output"));
  const counts = () => counters().map((s) => s.querySelector("output")!.textContent!.trim());
  const button = (root: ParentNode, label: RegExp) => {
    const found = [...root.querySelectorAll("button")].find((b) => label.test(b.textContent!.trim()));
    assert.ok(found, `a button labelled ${label}`);
    return found as HTMLButtonElement;
  };
  const click = async (b: HTMLButtonElement) => {
    b.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await settle();
  };

  assert.equal(counters().length, 3, "one counter per gate");
  assert.deepEqual(counts(), ["0", "0", "0"]);
  const plus = (i: number) => button(counters()[i], /^\+1$/);
  for (const [i, times] of [[0, 3], [1, 1], [2, 2]]) for (let n = 0; n < times; n++) await click(plus(i));
  assert.deepEqual(counts(), ["3", "1", "2"], "the +1 buttons count");

  await click(button(container, /^reset all$/i));
  assert.equal(counters().length, 3, "still one counter per gate after Reset all");
  assert.deepEqual(counts(), ["0", "0", "0"], "Reset all puts every counter back to 0");

  await click(plus(1));
  await click(plus(1));
  await click(plus(2));
  assert.deepEqual(counts(), ["0", "2", "1"], "counters count up again after Reset all");
  await click(button(counters()[1], /^reset$/i));
  assert.deepEqual(counts(), ["0", "0", "1"], "a counter's own Reset still resets only that counter");

  await click(button(container, /^reset all$/i));
  assert.deepEqual(counts(), ["0", "0", "0"], "Reset all works a second time");
  render(null, container);
});
