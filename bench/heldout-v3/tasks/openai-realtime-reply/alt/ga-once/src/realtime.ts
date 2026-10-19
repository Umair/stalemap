import type OpenAI from "openai";
import { OpenAIRealtimeWebSocket } from "openai/realtime/websocket";

export const REALTIME_MODEL = "gpt-4o-realtime-preview";

/** Asks the realtime model a question in text and resolves with its text reply. */
export async function ask(client: OpenAI, question: string): Promise<string> {
  const rt = new OpenAIRealtimeWebSocket({ model: REALTIME_MODEL }, client);
  rt.on("error", (err) => console.warn(`realtime: ${err.message}`));

  const reply = new Promise<string>((resolve) => {
    let final = "";
    rt.on("response.output_text.done", (event) => {
      final = event.text;
    });
    rt.once("response.done", () => resolve(final));
  });

  try {
    await new Promise<void>((resolve) => rt.once("session.created", () => resolve()));
    rt.send({ type: "session.update", session: { type: "realtime", output_modalities: ["text"] } });
    rt.send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: question }] },
    });
    rt.send({ type: "response.create" });

    return await reply;
  } finally {
    rt.close();
  }
}
