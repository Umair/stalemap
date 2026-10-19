import { Schema } from "mongoose";

const RESERVED_USERNAMES = ["admin", "root", "support"];

async function isAvailable(username: string): Promise<boolean> {
  // Stand-in for the lookup against the reserved-names service.
  await new Promise((resolve) => setTimeout(resolve, 5));
  return !RESERVED_USERNAMES.includes(username.toLowerCase());
}

export const userSchema = new Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address"],
  },
  username: {
    type: String,
    required: [true, "Pick a username"],
    minlength: [3, "Usernames need at least 3 characters"],
    validate: { validator: isAvailable, message: "That username is reserved" },
  },
  age: { type: Number, min: [13, "You must be at least 13"] },
});
