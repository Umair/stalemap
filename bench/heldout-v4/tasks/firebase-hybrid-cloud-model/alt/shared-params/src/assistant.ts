import { getGenerativeModel, type HybridParams } from "firebase/ai";
import { ai } from "./firebase.ts";

/** The cloud model the 12.x SDK used for hybrid inference; our prompts are tuned for it. */
const CLOUD_MODEL = "gemini-2.5-flash-lite";

const hybrid: HybridParams = {
  mode: "prefer_on_device",
  inCloudParams: { model: CLOUD_MODEL, generationConfig: {} },
};

// Runs on the user's device when Chrome's built-in model is available, otherwise in the cloud.
const assistant = getGenerativeModel(ai, hybrid);

/** Summarizes a note in one or two sentences for the notes list. */
export async function summarizeNote(note: string): Promise<string> {
  const result = await assistant.generateContent(`Summarize this note in one or two sentences:\n\n${note}`);
  return result.response.text().trim();
}
