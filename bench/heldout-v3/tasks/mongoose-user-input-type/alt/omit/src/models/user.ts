import { Schema, model, type InferRawDocType } from "mongoose";

export const userDefinition = {
  email: { type: String, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  roles: { type: [String], default: [] },
  marketingOptIn: { type: Boolean, default: false },
  age: { type: Number, min: 13 },
} as const;

export const userSchema = new Schema(userDefinition);
export const User = model("User", userSchema);

/** Plain user data as the API and the seed script pass it around, before it's saved. */
export type UserInput = Omit<InferRawDocType<typeof userDefinition>, "_id">;
