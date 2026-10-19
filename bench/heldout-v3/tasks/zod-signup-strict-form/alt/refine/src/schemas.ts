import { z } from "zod";
import { PasswordsMatch } from "./rules.ts";

export const ResetPasswordForm = z.object({ token: z.string().min(1) }).and(PasswordsMatch);

export const SignupForm = z
  .strictObject({
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    const result = PasswordsMatch.safeParse(data);
    if (result.success) return;
    for (const issue of result.error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
  });
