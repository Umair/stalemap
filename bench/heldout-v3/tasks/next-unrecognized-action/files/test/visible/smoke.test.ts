import assert from "node:assert/strict";
import { test } from "node:test";
import { forward } from "../../src/router/forward.ts";
test("exports forward()", () => assert.equal(typeof forward, "function"));
