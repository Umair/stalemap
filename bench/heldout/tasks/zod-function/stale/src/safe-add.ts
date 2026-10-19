import { z } from "zod";

export const safeAdd = z.function().args(z.number(), z.number()).returns(z.number()).implement((a, b) => a + b);
