import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.ts";
test("next.config.ts exports a config", () => assert.ok(config));
