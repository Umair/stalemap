import type OpenAI from "openai";
import { OpenAIRealtimeWebSocket } from "openai/beta/realtime/websocket";

export const REALTIME_MODEL = "gpt-4o-realtime-preview";

/** Asks the realtime model a question in text and resolves with its text reply. */
export async function ask(client: OpenAI, question: string): Promise<string> {
  throw new Error("not implemented");
}
