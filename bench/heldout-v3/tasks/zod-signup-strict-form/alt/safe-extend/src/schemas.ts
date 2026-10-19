import { z } from "zod";
import { PasswordsMatch } from "./rules.ts";

export const ResetPasswordForm = z.object({ token: z.string().min(1) }).and(PasswordsMatch);

export const SignupForm = PasswordsMatch.safeExtend({
  email: z.email(),
  password: z.string().min(8),
}).strict();
