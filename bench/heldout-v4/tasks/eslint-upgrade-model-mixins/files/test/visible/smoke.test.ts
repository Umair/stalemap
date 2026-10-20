import assert from "node:assert/strict";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

test("exports the model mixins", async () => {
  const { Model, Timestamped, Tracked, setClock } = await load("../../src/models/mixins.js");
  assert.equal(typeof Model, "function");
  assert.equal(typeof Timestamped, "function");
  assert.equal(typeof Tracked, "function");
  assert.equal(typeof setClock, "function");
});
