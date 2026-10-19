import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";

const Person = z.object({ name: z.string(), age: z.number() });

export async function extractPerson(model: LanguageModel, text: string): Promise<{ name: string; age: number }> {
  const { output } = await generateText({ model, prompt: `Extract the person: ${text}`, output: Output.object({ schema: Person }) });
  return output;
}
