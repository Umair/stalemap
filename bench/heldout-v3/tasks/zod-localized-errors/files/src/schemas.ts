import { z } from "zod";

export const SignupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  age: z.number().int().min(13),
});

export type Signup = z.infer<typeof SignupSchema>;
