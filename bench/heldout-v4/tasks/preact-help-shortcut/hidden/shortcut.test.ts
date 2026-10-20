import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { pretendToBeVisual: true });
const g = globalThis as any;
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "Event", "KeyboardEvent", "MouseEvent", "Text", "requestAnimationFrame", "cancelAnimationFrame"]) {
  Object.defineProperty(g, key, { value: (dom.window as any)[key], configurable: true, writable: true });
}
Object.defineProperty(g, "navigator", { value: dom.window.navigator, configurable: true });

const load = (id: string): Promise<any> => import(id);
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
const press = (key: string) => document.body.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

test("? toggles the panel, and removing the widget frees ? before the call returns", async () => {
  const { mountHelpWidget } = await load("../../src/embed.tsx");
  const { bindKey, isBound } = await load("../../src/keyboard.ts");
  const container = document.createElement("div");
  document.body.appendChild(container);
  const panelOpen = () => container.querySelector(".help-panel") !== null;

  const unmount = mountHelpWidget(container);
  await settle();
  assert.equal(panelOpen(), false, "the panel starts closed");
  assert.equal(isBound("?"), true, "the widget binds ? through keyboard.ts");
  press("?");
  await settle();
  assert.equal(panelOpen(), true, "? opens the panel");
  press("?");
  await settle();
  assert.equal(panelOpen(), false, "? closes the panel again");

  unmount();
  assert.equal(isBound("?"), false, "? is released by the time the remove function returns");
  let hostPresses = 0;
  let unbindHost: () => void = () => {};
  assert.doesNotThrow(() => {
    unbindHost = bindKey("?", () => hostPresses++);
  }, "the partner page can bind ? right after removing the widget");
  press("?");
  assert.equal(hostPresses, 1, "the partner page's ? handler runs");
  await settle();
  assert.equal(container.querySelector(".help-widget"), null, "the widget is gone");
  unbindHost();

  // Mounting again later works, and the shortcut works again.
  const unmountAgain = mountHelpWidget(container);
  await settle();
  press("?");
  await settle();
  assert.equal(panelOpen(), true, "? opens the panel after mounting again");
  unmountAgain();
  assert.equal(isBound("?"), false, "? is released again");
  await settle();
});
