import type { UserInput } from "./models/user.ts";

/** Fills in the defaults the signup form doesn't send. */
export function fromSignupForm(form: { email: string; name: string; age?: number }): UserInput {
  return { ...form, roles: [], marketingOptIn: false };
}
