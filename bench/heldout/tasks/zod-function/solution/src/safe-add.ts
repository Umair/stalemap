import { z } from "zod";

export const safeAdd = z.function({ input: [z.number(), z.number()], output: z.number() }).implement((a, b) => a + b);
