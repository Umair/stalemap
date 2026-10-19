import { generateText, tool, convertToCoreMessages, type CoreMessage, type LanguageModel, type Message } from "ai";
import { z } from "zod";

const lookupOrder = tool({
  description: "Look up an order by id",
  parameters: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => ({ orderId, status: "shipped" }),
});

export async function assist(model: LanguageModel, messages: Message[]): Promise<{ text: string; history: CoreMessage[] }> {
  const history = convertToCoreMessages(messages);
  const result = await generateText({ model, messages: history, tools: { lookupOrder }, maxSteps: 3, maxTokens: 400 });
  return { text: result.text, history };
}
