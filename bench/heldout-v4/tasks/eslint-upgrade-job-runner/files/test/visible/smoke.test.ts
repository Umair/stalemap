import assert from "node:assert/strict";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

test("exports the job runner", async () => {
  const { createRunner, createLocks } = await load("../../src/jobs/runner.js");
  assert.equal(typeof createRunner, "function");
  assert.equal(typeof createLocks, "function");
});
