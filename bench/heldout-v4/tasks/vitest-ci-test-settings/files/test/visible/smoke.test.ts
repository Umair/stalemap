import assert from "node:assert/strict";
import { test } from "node:test";
import { getTestSettings } from "../../src/tooling/test-settings.ts";

test("getTestSettings is exported", () => assert.equal(typeof getTestSettings, "function"));
