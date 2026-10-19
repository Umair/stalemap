import { generateText, stepCountIs, tool, type LanguageModel } from "ai";
import { z } from "zod";

const getWeather = tool({
  description: "Get the weather for a city",
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, forecast: "sunny" }),
});

export async function answer(model: LanguageModel, question: string): Promise<string> {
  const { text } = await generateText({ model, prompt: question, tools: { getWeather }, stopWhen: stepCountIs(5) });
  return text;
}
