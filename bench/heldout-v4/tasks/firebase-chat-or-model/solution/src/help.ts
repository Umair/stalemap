import { getGenerativeModel, type ChatSession, type GenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export const helpModel = getGenerativeModel(ai, {
  model: "gemini-3-flash",
  systemInstruction: "You answer questions about the Acme help center. Be brief.",
});

/** Answers a help-center question, continuing the conversation when given a chat. */
export async function ask(target: GenerativeModel | ChatSession, question: string): Promise<string> {
  const result = "sendMessage" in target ? await target.sendMessage(question) : await target.generateContent(question);
  return result.response.text();
}
