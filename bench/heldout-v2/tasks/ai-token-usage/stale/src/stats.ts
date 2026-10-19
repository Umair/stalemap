import { generateText, type LanguageModel } from "ai";

export interface AnswerStats {
  text: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

export async function answerWithStats(model: LanguageModel, prompt: string): Promise<AnswerStats> {
  const { text, usage } = await generateText({ model, prompt });
  return {
    text,
    inputTokens: usage.inputTokens ?? 0,
    cachedTokens: usage.cachedInputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}
