import { z } from "zod";
import { PasswordsMatch } from "./rules.ts";

export const ResetPasswordForm = z.object({ token: z.string().min(1) }).and(PasswordsMatch);

// TODO
export const SignupForm = z.never();
