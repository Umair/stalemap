import assert from "node:assert/strict";
import { test } from "node:test";
import { runAgent } from "../../src/agent.ts";
test("exports runAgent()", () => assert.equal(typeof runAgent, "function"));
