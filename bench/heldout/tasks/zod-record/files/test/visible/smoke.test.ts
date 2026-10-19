import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/counts.ts";
test("exports WordCountsSchema", () => assert.ok((mod as Record<string, unknown>).WordCountsSchema));
