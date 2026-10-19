import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/role.ts";
test("exports RoleSchema", () => assert.ok((mod as Record<string, unknown>).RoleSchema));
