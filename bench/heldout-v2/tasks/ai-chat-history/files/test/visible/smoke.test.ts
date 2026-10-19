import assert from "node:assert/strict";
import { test } from "node:test";
import { chatTurn } from "../../src/chat.ts";
test("exports chatTurn()", () => assert.equal(typeof chatTurn, "function"));
