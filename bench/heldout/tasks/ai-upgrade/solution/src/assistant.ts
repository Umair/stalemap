import { generateText, tool, convertToModelMessages, isStepCount, type ModelMessage, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";

const lookupOrder = tool({
  description: "Look up an order by id",
  inputSchema: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => ({ orderId, status: "shipped" }),
});

export async function assist(model: LanguageModel, messages: UIMessage[]): Promise<{ text: string; history: ModelMessage[] }> {
  const history = await convertToModelMessages(messages);
  const result = await generateText({ model, messages: history, tools: { lookupOrder }, stopWhen: isStepCount(3), maxOutputTokens: 400 });
  return { text: result.text, history };
}
