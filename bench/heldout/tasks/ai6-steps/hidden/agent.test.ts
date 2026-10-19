import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV3 } from "ai/test";
import { runAgent } from "../../src/agent.ts";
const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } };
test("calls the tool, counts it, and answers", async () => {
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async () => {
      calls++;
      return calls === 1
        ? { content: [{ type: "tool-call", toolCallId: "c1", toolName: "getWeather", input: JSON.stringify({ city: "Oslo" }) }], finishReason: { unified: "tool-calls", raw: undefined }, usage, warnings: [] }
        : { content: [{ type: "text", text: "It is sunny." }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] };
    },
  } as any);
  const out = await runAgent(model as any, "Weather in Oslo?");
  assert.deepEqual(out, { text: "It is sunny.", toolCalls: 1 });
  assert.match(JSON.stringify(model.doGenerateCalls[0].prompt), /weather assistant/);
});
