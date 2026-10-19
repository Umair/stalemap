import { userSchema } from "./models/user.ts";

/** Checks one signup field as the user types: null when the value is fine, otherwise the message to show. */
export function checkField(field: "email" | "username" | "age", value: unknown): Promise<string | null> {
  const path = userSchema.path(field) as any;
  return new Promise((resolve) => {
    path.doValidate(value, (err: Error | null) => resolve(err ? err.message : null));
  });
}
