import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/messages.ts";

test("converts UI messages to model messages", async () => {
  const toModelMessages = (mod as Record<string, unknown>).toModelMessages as (m: unknown) => Promise<Array<{ role: string }>>;
  assert.equal(typeof toModelMessages, "function");
  const out = await toModelMessages([
    { id: "1", role: "user", parts: [{ type: "text", text: "Hi" }] },
    { id: "2", role: "assistant", parts: [{ type: "text", text: "Hello!" }] },
  ]);
  assert.deepEqual(out.map((m) => m.role), ["user", "assistant"]);
  assert.match(JSON.stringify(out), /Hello!/);
});
