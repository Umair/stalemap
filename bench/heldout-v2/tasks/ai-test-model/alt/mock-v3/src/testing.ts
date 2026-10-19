import { MockLanguageModelV3 } from "ai/test";

export function fakeModel(reply: string): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text: reply }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 0, text: 0, reasoning: 0 } },
      warnings: [],
    }),
  });
}
