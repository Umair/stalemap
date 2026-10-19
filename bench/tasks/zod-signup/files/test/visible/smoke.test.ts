import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/signup.ts";
test("exports SignupSchema", () => assert.ok((mod as Record<string, unknown>).SignupSchema));
