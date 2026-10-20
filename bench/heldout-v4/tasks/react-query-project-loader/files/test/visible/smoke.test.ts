import assert from "node:assert/strict";
import { test } from "node:test";
import { projectLoader } from "../../src/loaders.ts";
import { projectQuery } from "../../src/queries.ts";

test("exports projectLoader() and projectQuery()", () => {
  assert.equal(typeof projectLoader, "function");
  assert.deepEqual(projectQuery("p1").queryKey, ["project", "p1"]);
});
