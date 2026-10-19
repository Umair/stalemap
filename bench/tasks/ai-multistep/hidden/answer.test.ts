import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import { answer } from "../../src/answer.ts";

const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };

test("calls getWeather, then answers with the final text", async () => {
  let calls = 0;
  const model = new MockLanguageModelV4({
    doGenerate: async () => {
      calls++;
      return calls === 1
        ? { content: [{ type: "tool-call", toolCallId: "c1", toolName: "getWeather", input: JSON.stringify({ city: "Paris" }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] }
        : { content: [{ type: "text", text: "It is sunny in Paris." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  });
  assert.equal(await answer(model, "Weather in Paris?"), "It is sunny in Paris.");
  assert.equal(model.doGenerateCalls.length, 2, "the model is called again after the tool result");
  assert.match(JSON.stringify(model.doGenerateCalls[1].prompt), /sunny/, "the tool result is sent back");
});
