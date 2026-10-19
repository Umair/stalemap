import type { SchemaType } from "mongoose";
import { userSchema } from "./models/user.ts";

type ValidatingPath = SchemaType & { doValidate(value: unknown, scope?: unknown): Promise<void> };

/** Checks one signup field as the user types: null when the value is fine, otherwise the message to show. */
export async function checkField(field: "email" | "username" | "age", value: unknown): Promise<string | null> {
  const path = userSchema.path(field) as unknown as ValidatingPath;
  try {
    await path.doValidate(value);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}
