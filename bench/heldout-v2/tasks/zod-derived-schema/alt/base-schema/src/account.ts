import { z } from "zod";

export const BaseAccountSchema = z.object({
  email: z.email(),
  displayName: z.string().trim().min(1).max(40),
  password: z.string().min(12),
  confirmPassword: z.string(),
});

export const AccountSchema = BaseAccountSchema.refine((a) => a.password === a.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
