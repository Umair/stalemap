import { MockLanguageModelV1 } from "ai/test";

export function fakeModel(reply: string): MockLanguageModelV1 {
  return new MockLanguageModelV1({
    doGenerate: async () => ({
      rawCall: { rawPrompt: null, rawSettings: {} },
      finishReason: "stop",
      usage: { promptTokens: 0, completionTokens: 0 },
      text: reply,
    }),
  });
}
