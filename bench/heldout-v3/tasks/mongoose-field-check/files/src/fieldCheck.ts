import { userSchema } from "./models/user.ts";

/** Checks one signup field as the user types: null when the value is fine, otherwise the message to show. */
export async function checkField(field: "email" | "username" | "age", value: unknown): Promise<string | null> {
  throw new Error("not implemented");
}
