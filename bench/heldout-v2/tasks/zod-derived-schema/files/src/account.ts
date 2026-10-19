import { z } from "zod";

export const AccountSchema = z
  .object({
    email: z.email(),
    displayName: z.string().trim().min(1).max(40),
    password: z.string().min(12),
    confirmPassword: z.string(),
  })
  .refine((a) => a.password === a.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
