import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/profile.ts";
test("exports ProfileSchema", () => assert.ok((mod as Record<string, unknown>).ProfileSchema));
