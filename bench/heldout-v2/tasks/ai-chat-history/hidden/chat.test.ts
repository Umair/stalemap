import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import * as mod from "../../src/chat.ts";
const chatTurn = (mod as Record<string, any>).chatTurn;
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
test("the next turn sees this turn's tool call and result", async () => {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls++;
      if (calls === 1) return { content: [{ type: "tool-call", toolCallId: "c1", toolName: "lookupOrder", input: JSON.stringify({ orderId: "42" }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] };
      return { content: [{ type: "text", text: calls === 2 ? "Order 42 has shipped." : "Yes, it shipped." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
  const earlier = [{ role: "user", content: "Hi" }, { role: "assistant", content: [{ type: "text", text: "Hello! How can I help?" }] }];
  const first = await chatTurn(model, earlier, "Where is order 42?");
  assert.equal(first.reply, "Order 42 has shipped.");
  assert.deepEqual(first.history.map((m: { role: string }) => m.role), ["user", "assistant", "user", "assistant", "tool", "assistant"]);
  const second = await chatTurn(model, first.history, "Are you sure?");
  assert.equal(second.reply, "Yes, it shipped.");
  const prompt = JSON.stringify(model.doGenerateCalls[2].prompt);
  assert.match(prompt, /lookupOrder/, "the earlier tool call is in the next prompt");
  assert.match(prompt, /shipped/, "and so is its result");
});
