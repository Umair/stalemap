import type { LanguageModel } from "ai";

export async function extractPerson(model: LanguageModel, text: string): Promise<{ name: string; age: number }> {
  throw new Error("not implemented");
}
