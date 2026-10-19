import type OpenAI from "openai";
import { OpenAIRealtimeWebSocket } from "openai/beta/realtime/websocket";

export const REALTIME_MODEL = "gpt-4o-realtime-preview";

/** Asks the realtime model a question in text and resolves with its text reply. */
export async function ask(client: OpenAI, question: string): Promise<string> {
  const rt = new OpenAIRealtimeWebSocket({ model: REALTIME_MODEL }, client);
  // Errors about individual events don't end the session: log them and keep going.
  rt.on("error", (err) => console.warn("Realtime API error:", err.message));

  let text = "";
  rt.on("response.text.delta", (event) => {
    text += event.delta;
  });
  const done = new Promise<void>((resolve) => rt.on("response.done", () => resolve()));

  await new Promise((resolve) => rt.socket.addEventListener("open", resolve, { once: true }));
  rt.send({ type: "session.update", session: { modalities: ["text"] } });
  rt.send({
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text", text: question }] },
  });
  rt.send({ type: "response.create" });

  await done;
  rt.close();
  return text;
}
