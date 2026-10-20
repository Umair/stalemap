import assert from "node:assert/strict";
import { test } from "node:test";
import { verifiedEvent } from "../../src/replay.ts";
import { replayDeliveries } from "../../src/replayJob.ts";
test("exports verifiedEvent() and replayDeliveries()", () => {
  assert.equal(typeof verifiedEvent, "function");
  assert.equal(typeof replayDeliveries, "function");
});
