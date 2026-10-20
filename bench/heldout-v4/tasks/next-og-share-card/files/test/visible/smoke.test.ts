import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.ts";
import { GET } from "../../app/api/og/route.tsx";
test("next.config.ts exports a config", () => assert.ok(config));
test("the share-card route exports GET", () => assert.equal(typeof GET, "function"));
