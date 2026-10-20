import assert from "node:assert/strict";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

function fakeNodeGlobal() {
  class NodeEvent {}
  class NodeEventTarget {}
  const nodeNavigator = { userAgent: "Node.js/22", hardwareConcurrency: 8 };
  const g: any = { Event: NodeEvent, setTimeout, console };
  // Node defines some globals as lazy getters.
  Object.defineProperty(g, "navigator", { get: () => nodeNavigator, configurable: true, enumerable: true });
  Object.defineProperty(g, "EventTarget", { value: NodeEventTarget, writable: true, configurable: true, enumerable: false });
  return { g, NodeEvent, NodeEventTarget, nodeNavigator };
}

test("setup installs the kiosk window as globals", async () => {
  const env = (await load("../../src/testing/kiosk-environment.ts")).default;
  const { g } = fakeNodeGlobal();
  const { teardown } = await env.setup(g, {});
  try {
    assert.equal(g.kioskShell?.version, "3.2");
    assert.notEqual(g.navigator?.userAgent, "Node.js/22");
    assert.equal(typeof g.document?.createElement, "function");
    assert.equal(g.location.href, "https://kiosk.local/checkout");
  } finally {
    await teardown(g);
  }
});

test("teardown restores the original globals and removes the added ones", async () => {
  const env = (await load("../../src/testing/kiosk-environment.ts")).default;
  const { g, NodeEvent, NodeEventTarget, nodeNavigator } = fakeNodeGlobal();
  const { teardown } = await env.setup(g, {});
  await teardown(g);

  assert.equal(g.Event, NodeEvent, "Event was not restored");
  assert.equal(g.EventTarget, NodeEventTarget, "EventTarget was not restored");
  assert.equal(g.navigator, nodeNavigator, "navigator was not restored");
  assert.equal(g.setTimeout, setTimeout);
  for (const key of ["document", "HTMLElement", "location", "localStorage", "kioskShell"]) {
    assert.equal(key in g, false, `${key} is still defined after teardown`);
  }
});

test("each test file gets a clean global after the previous one tears down", async () => {
  const env = (await load("../../src/testing/kiosk-environment.ts")).default;
  const { g, nodeNavigator } = fakeNodeGlobal();
  for (let i = 0; i < 2; i++) {
    const { teardown } = await env.setup(g, {});
    assert.equal(g.kioskShell?.version, "3.2");
    assert.notEqual(g.navigator, nodeNavigator);
    await teardown(g);
    assert.equal(g.navigator, nodeNavigator);
  }
});
