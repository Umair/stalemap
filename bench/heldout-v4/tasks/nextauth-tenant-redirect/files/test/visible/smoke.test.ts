import assert from "node:assert/strict";
import { test } from "node:test";
import { authOptions } from "../../src/auth.ts";
test("exports authOptions", () => assert.ok(authOptions.providers.length > 0));
