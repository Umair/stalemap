import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
test("has a Prisma schema", () => assert.ok(existsSync(new URL("../../prisma/schema.prisma", import.meta.url))));
