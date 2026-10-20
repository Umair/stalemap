import assert from "node:assert/strict";
import { test } from "node:test";

test("voice module exports", async () => {
  const voice = await import("../../src/voice.ts");
  assert.equal(typeof voice.connectVoice, "function");
  assert.equal(typeof voice.streamMicrophone, "function");
});
