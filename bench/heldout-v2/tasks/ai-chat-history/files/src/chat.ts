import { generateText, isStepCount, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";

const lookupOrder = tool({
  description: "Look up an order by id",
  inputSchema: z.object({ orderId: z.string() }),
  execute: async ({ orderId }) => ({ orderId, status: "shipped" }),
});

export async function chatTurn(model: LanguageModel, history: ModelMessage[], userText: string): Promise<{ reply: string; history: ModelMessage[] }> {
  const messages: ModelMessage[] = [...history, { role: "user", content: userText }];
  const result = await generateText({ model, messages, tools: { lookupOrder }, stopWhen: isStepCount(3) });
  // TODO: return the reply and the history for the next turn.
  throw new Error("not implemented");
}
