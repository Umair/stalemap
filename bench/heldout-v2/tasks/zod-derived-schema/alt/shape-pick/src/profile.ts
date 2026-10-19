import { z } from "zod";
import { AccountSchema } from "./account.ts";

export const ProfileSchema = z.object(AccountSchema.shape).pick({ email: true, displayName: true });
