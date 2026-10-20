import { AgentPlatformBackend, getAI, getGenerativeModel, type Backend } from "firebase/ai";
import { app } from "./firebase.ts";

/** Data residency: all AI requests stay in the EU. */
export const AI_REGION = "europe-west1";
const backend: Backend = new AgentPlatformBackend(AI_REGION);

export const ai = getAI(app, { backend });

const model = getGenerativeModel(ai, { model: "gemini-3-flash" });

/** Summarizes a support ticket for the agent dashboard. */
export async function summarizeTicket(ticket: string): Promise<string> {
  const result = await model.generateContent(`Summarize this support ticket in one sentence:\n\n${ticket}`);
  return result.response.text().trim();
}
