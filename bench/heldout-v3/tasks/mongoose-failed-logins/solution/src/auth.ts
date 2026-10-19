import type { UserDocument } from "./models/user.ts";

/** Resolves to whether `password` is this user's password. */
export function checkLogin(user: UserDocument, password: string): Promise<boolean> {
  return user.comparePassword(password);
}
