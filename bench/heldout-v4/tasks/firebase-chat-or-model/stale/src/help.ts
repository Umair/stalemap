import { ChatSession, getGenerativeModel, type GenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export const helpModel = getGenerativeModel(ai, {
  model: "gemini-3-flash",
  systemInstruction: "You answer questions about the Acme help center. Be brief.",
});

/** Answers a help-center question, continuing the conversation when given a chat. */
export async function ask(target: GenerativeModel | ChatSession, question: string): Promise<string> {
  if (target instanceof ChatSession) {
    const result = await target.sendMessage(question);
    return result.response.text();
  }
  const result = await target.generateContent(question);
  return result.response.text();
}
