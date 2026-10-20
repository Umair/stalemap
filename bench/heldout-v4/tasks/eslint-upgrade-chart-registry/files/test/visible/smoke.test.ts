import assert from "node:assert/strict";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

test("exports the chart registry", async () => {
  const { charts, menu } = await load("../../src/charts/registry.js");
  assert.equal(typeof charts, "object");
  assert.equal(typeof menu.create, "function");
});
