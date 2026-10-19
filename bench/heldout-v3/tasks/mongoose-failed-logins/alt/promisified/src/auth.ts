import type { UserDocument } from "./models/user.ts";

/** Resolves to whether `password` is this user's password. */
export async function checkLogin(user: UserDocument, password: string): Promise<boolean> {
  const ok = await user.comparePassword(password);
  return ok;
}
