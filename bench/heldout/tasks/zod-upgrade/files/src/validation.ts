import { z } from "zod";

export const Role = z.nativeEnum({ Admin: "admin", Member: "member" } as const);

export const UserSchema = z
  .object({
    email: z.string({ required_error: "Email is required" }).email("Invalid email"),
    role: Role,
    tags: z.record(z.boolean()),
  })
  .strict();

export function userErrors(input: unknown): string[] {
  const r = UserSchema.safeParse(input);
  return r.success ? [] : r.error.errors.map((e) => e.message);
}
