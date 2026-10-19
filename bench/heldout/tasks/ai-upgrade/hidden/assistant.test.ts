import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import * as mod from "../../src/assistant.ts";
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
test("tool call, then answer, with the same limits", async () => {
  const assist = (mod as Record<string, any>).assist;
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls++;
      return calls === 1
        ? { content: [{ type: "tool-call", toolCallId: "c1", toolName: "lookupOrder", input: JSON.stringify({ orderId: "42" }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] }
        : { content: [{ type: "text", text: "Your order shipped." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
  const out = await assist(model, [{ id: "1", role: "user", parts: [{ type: "text", text: "Where is order 42?" }] }]);
  assert.equal(out.text, "Your order shipped.");
  assert.deepEqual(out.history.map((m: { role: string }) => m.role), ["user"]);
  assert.equal(model.doGenerateCalls.length, 2, "kept going after the tool call");
  assert.equal(model.doGenerateCalls[0].maxOutputTokens, 400, "output-token limit preserved");
  assert.match(JSON.stringify(model.doGenerateCalls[1].prompt), /shipped/);
});
