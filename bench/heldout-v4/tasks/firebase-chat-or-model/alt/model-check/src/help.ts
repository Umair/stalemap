import { GenerativeModel, getGenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export const helpModel = getGenerativeModel(ai, {
  model: "gemini-3-flash",
  systemInstruction: "You answer questions about the Acme help center. Be brief.",
});

type Chat = ReturnType<GenerativeModel["startChat"]>;

/** Answers a help-center question, continuing the conversation when given a chat. */
export async function ask(target: GenerativeModel | Chat, question: string): Promise<string> {
  if (target instanceof GenerativeModel) {
    return (await target.generateContent(question)).response.text();
  }
  const reply = await target.sendMessage(question);
  return reply.response.text();
}
