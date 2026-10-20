import assert from "node:assert/strict";
import { test } from "node:test";
import { listTests } from "../../src/tooling/list-tests.ts";

test("listTests is exported", () => assert.equal(typeof listTests, "function"));
