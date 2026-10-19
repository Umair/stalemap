import assert from "node:assert/strict";
import { test } from "node:test";
import { MockLanguageModelV4 } from "ai/test";
import * as mod from "../../src/stats.ts";
const answerWithStats = (mod as Record<string, any>).answerWithStats;
const stop = { unified: "stop", raw: undefined } as const;
test("input, cached and output tokens", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: "Hello" }],
      finishReason: stop,
      usage: { inputTokens: { total: 1200, noCache: 200, cacheRead: 1000, cacheWrite: 0 }, outputTokens: { total: 7, text: 7, reasoning: 0 } },
      warnings: [],
    }),
  });
  assert.deepEqual(await answerWithStats(model, "Hi"), { text: "Hello", inputTokens: 1200, cachedTokens: 1000, outputTokens: 7 });
  assert.match(JSON.stringify(model.doGenerateCalls[0].prompt), /Hi/);
});
test("counts the provider doesn't report are 0", async () => {
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: "Hey" }],
      finishReason: stop,
      usage: { inputTokens: { total: 5, noCache: undefined, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: undefined, text: undefined, reasoning: undefined } },
      warnings: [],
    }),
  });
  assert.deepEqual(await answerWithStats(model, "Hi"), { text: "Hey", inputTokens: 5, cachedTokens: 0, outputTokens: 0 });
});
