import { generateText, isStepCount, tool, type LanguageModel } from "ai";
import { z } from "zod";

const getWeather = tool({
  description: "Get the weather for a city",
  inputSchema: z.object({ city: z.string() }),
  execute: async ({ city }) => ({ city, forecast: "sunny" }),
});

export async function runAgent(model: LanguageModel, question: string): Promise<{ text: string; toolCalls: number }> {
  let toolCalls = 0;
  const { text } = await generateText({
    model,
    instructions: "You are a weather assistant.",
    prompt: question,
    tools: { getWeather },
    stopWhen: isStepCount(4),
    onStepEnd: (step) => {
      toolCalls += step.toolCalls.length;
    },
  });
  return { text, toolCalls };
}
