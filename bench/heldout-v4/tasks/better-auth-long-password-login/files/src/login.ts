import { auth } from "./auth.ts";

export type LoginResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401; error: "invalid_credentials" };

/** Signs a user in with email and password for the login form's API route. */
export async function login(email: string, password: string): Promise<LoginResult> {
  void auth;
  throw new Error("not implemented");
}
