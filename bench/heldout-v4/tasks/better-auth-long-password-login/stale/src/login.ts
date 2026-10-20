import { APIError } from "better-auth/api";
import { auth } from "./auth.ts";

export type LoginResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401; error: "invalid_credentials" };

/** Signs a user in with email and password for the login form's API route. */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const { user, token } = await auth.api.signInEmail({ body: { email, password } });
    return { ok: true, userId: user.id, token };
  } catch (err) {
    // Wrong password, unknown email or an over-long password all fail the credential check.
    if (err instanceof APIError && err.body?.code === "INVALID_EMAIL_OR_PASSWORD") {
      return { ok: false, status: 401, error: "invalid_credentials" };
    }
    throw err;
  }
}
