import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../vitest.config.ts";

test("vitest.config.ts exports a config", () => assert.ok(config));
