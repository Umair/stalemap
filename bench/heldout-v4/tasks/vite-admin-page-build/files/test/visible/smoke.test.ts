import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../vite.config.ts";
test("vite.config.ts exports a config", () => assert.equal(typeof config, "object"));
