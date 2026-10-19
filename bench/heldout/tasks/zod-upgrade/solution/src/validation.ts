import { z } from "zod";

export const Role = z.enum({ Admin: "admin", Member: "member" } as const);

export const UserSchema = z.strictObject({
  email: z.email({ error: (iss) => (iss.input === undefined ? "Email is required" : "Invalid email") }),
  role: Role,
  tags: z.record(z.string(), z.boolean()),
});

export function userErrors(input: unknown): string[] {
  const r = UserSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((e) => e.message);
}
