import mongoose, { type Error as MongooseError } from "mongoose";
import { userSchema } from "./models/user.ts";

// A bare document bound to the schema, so no model has to be registered.
const BareDocument = mongoose.Document as unknown as new (obj: object, schema: typeof userSchema) => mongoose.Document;

/** Checks one signup field as the user types: null when the value is fine, otherwise the message to show. */
export async function checkField(field: "email" | "username" | "age", value: unknown): Promise<string | null> {
  const doc = new BareDocument({ [field]: value }, userSchema);
  try {
    await doc.validate([field]);
    return null;
  } catch (err) {
    const errors = (err as MongooseError.ValidationError).errors ?? {};
    return errors[field]?.message ?? (err as Error).message;
  }
}
