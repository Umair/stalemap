import { convertToModelMessages, type ModelMessage, type UIMessage } from "ai";

export async function toModelMessages(messages: UIMessage[]): Promise<ModelMessage[]> {
  return convertToModelMessages(messages);
}
