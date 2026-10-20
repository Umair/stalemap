import { getGenerativeModel, InferenceMode } from "firebase/ai";
import { ai } from "./firebase.ts";

// Runs on the user's device when Chrome's built-in model is available, otherwise in the cloud.
const assistant = getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE });

/** Summarizes a note in one or two sentences for the notes list. */
export async function summarizeNote(note: string): Promise<string> {
  const result = await assistant.generateContent(`Summarize this note in one or two sentences:\n\n${note}`);
  return result.response.text().trim();
}
