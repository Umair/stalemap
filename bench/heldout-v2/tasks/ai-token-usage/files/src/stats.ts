import type { LanguageModel } from "ai";

export interface AnswerStats {
  text: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

export async function answerWithStats(model: LanguageModel, prompt: string): Promise<AnswerStats> {
  throw new Error("not implemented");
}
