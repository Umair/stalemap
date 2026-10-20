import { getGenerativeModel, type GenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export const helpModel = getGenerativeModel(ai, {
  model: "gemini-3-flash",
  systemInstruction: "You answer questions about the Acme help center. Be brief.",
});

/** Answers a help-center question. */
export async function ask(model: GenerativeModel, question: string): Promise<string> {
  const result = await model.generateContent(question);
  return result.response.text();
}
