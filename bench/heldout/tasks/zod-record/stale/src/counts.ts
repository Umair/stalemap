import { z } from "zod";

export const WordCountsSchema = z.record(z.number().int().nonnegative());
