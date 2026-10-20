import { getAI, getGenerativeModel, VertexAIBackend } from "firebase/ai";
import { app } from "./firebase.ts";

export const ai = getAI(app, { backend: new VertexAIBackend("europe-west1") });

const model = getGenerativeModel(ai, { model: "gemini-3-flash" });

/** Summarizes a support ticket for the agent dashboard. */
export async function summarizeTicket(ticket: string): Promise<string> {
  const result = await model.generateContent(`Summarize this support ticket in one sentence:\n\n${ticket}`);
  return result.response.text().trim();
}
