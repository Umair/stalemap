import assert from "node:assert/strict";
import { test } from "node:test";
import { publishPost } from "../../src/actions.ts";
test("exports publishPost()", () => assert.equal(typeof publishPost, "function"));
