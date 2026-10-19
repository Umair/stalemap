import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "../../src/app.ts";
test("exports createApp()", () => assert.equal(typeof createApp, "function"));
