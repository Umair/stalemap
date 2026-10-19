import { generateText, type LanguageModel } from "ai";

export interface AnswerStats {
  text: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

export async function answerWithStats(model: LanguageModel, prompt: string): Promise<AnswerStats> {
  const result = await generateText({ model, prompt });
  const { inputTokens = 0, outputTokens = 0, inputTokenDetails } = result.usage;
  return { text: result.text, inputTokens, cachedTokens: inputTokenDetails?.cacheReadTokens ?? 0, outputTokens };
}
