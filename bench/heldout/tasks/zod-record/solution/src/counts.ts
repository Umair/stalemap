import { z } from "zod";

export const WordCountsSchema = z.record(z.string(), z.number().int().nonnegative());
