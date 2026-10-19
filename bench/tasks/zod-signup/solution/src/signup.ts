import { z } from "zod";

export const SignupSchema = z.object({
  email: z.email({
    error: (issue) => (issue.input === undefined ? "Email is required" : typeof issue.input !== "string" ? "Email must be text" : "Invalid email"),
  }),
  age: z.number().min(18, { error: "Must be 18 or older" }),
});
