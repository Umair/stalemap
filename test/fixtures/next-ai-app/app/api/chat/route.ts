import { streamText, convertToCoreMessages, tool, type CoreMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: CoreMessage[] } = await req.json();
  const result = streamText({
    model: openai("gpt-4o"),
    messages: convertToCoreMessages(messages),
    maxSteps: 5,
    tools: {
      weather: tool({
        description: "Get the weather",
        parameters: z.object({ city: z.string() }),
        execute: async ({ city }) => ({ city, temp: 21 }),
      }),
    },
  });
  return result.toDataStreamResponse();
}
