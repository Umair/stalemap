import { APIError } from "better-auth/api";
import { auth } from "./auth.ts";

export type LoginResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401; error: "invalid_credentials" };

const INVALID: LoginResult = { ok: false, status: 401, error: "invalid_credentials" };
const MAX_PASSWORD_LENGTH = 128; // better-auth's default maxPasswordLength

export async function login(email: string, password: string): Promise<LoginResult> {
  if (password.length > MAX_PASSWORD_LENGTH) return INVALID;
  try {
    const { user, token } = await auth.api.signInEmail({ body: { email, password } });
    return { ok: true, userId: user.id, token };
  } catch (err) {
    if (err instanceof APIError && err.body?.code === "INVALID_EMAIL_OR_PASSWORD") return INVALID;
    throw err;
  }
}
