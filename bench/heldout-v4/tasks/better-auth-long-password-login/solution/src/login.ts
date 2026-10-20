import { APIError } from "better-auth/api";
import { auth } from "./auth.ts";

export type LoginResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401; error: "invalid_credentials" };

// better-auth rejects a password longer than the configured maximum with PASSWORD_TOO_LONG before checking it.
const REJECTED_CREDENTIALS = new Set(["INVALID_EMAIL_OR_PASSWORD", "PASSWORD_TOO_LONG"]);

/** Signs a user in with email and password for the login form's API route. */
export async function login(email: string, password: string): Promise<LoginResult> {
  try {
    const { user, token } = await auth.api.signInEmail({ body: { email, password } });
    return { ok: true, userId: user.id, token };
  } catch (err) {
    if (err instanceof APIError && REJECTED_CREDENTIALS.has(String(err.body?.code))) {
      return { ok: false, status: 401, error: "invalid_credentials" };
    }
    throw err;
  }
}
