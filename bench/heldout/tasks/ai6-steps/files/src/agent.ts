import type { LanguageModel } from "ai";

export async function runAgent(model: LanguageModel, question: string): Promise<{ text: string; toolCalls: number }> {
  throw new Error("not implemented");
}
