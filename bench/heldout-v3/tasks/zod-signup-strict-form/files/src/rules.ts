import { z } from "zod";

/** Shared rule for every form that asks for a password twice. */
export const PasswordsMatch = z
  .object({ password: z.string(), confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
