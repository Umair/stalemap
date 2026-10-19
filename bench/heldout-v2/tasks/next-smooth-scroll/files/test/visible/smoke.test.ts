import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
test("has a root layout", () => assert.ok(existsSync(new URL("../../app/layout.tsx", import.meta.url))));
