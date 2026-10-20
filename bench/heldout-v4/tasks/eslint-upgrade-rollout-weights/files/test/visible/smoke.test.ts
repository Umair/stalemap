import assert from "node:assert/strict";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

test("exports the rollout helpers", async () => {
  const { normalize, pick, bucketFor } = await load("../../src/rollout/weights.js");
  assert.equal(typeof normalize, "function");
  assert.equal(typeof pick, "function");
  assert.equal(typeof bucketFor, "function");
});
