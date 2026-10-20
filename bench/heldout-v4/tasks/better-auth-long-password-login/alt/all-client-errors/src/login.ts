import { auth } from "./auth.ts";

export type LoginResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; status: 401; error: "invalid_credentials" };

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  if (res.status === 400 || res.status === 401) return { ok: false, status: 401, error: "invalid_credentials" };
  if (!res.ok) throw new Error(`sign-in failed with HTTP ${res.status}`);
  const body = (await res.json()) as { token: string; user: { id: string } };
  return { ok: true, userId: body.user.id, token: body.token };
}
