import { z } from "zod";
import { AccountSchema } from "./account.ts";

export const ProfileSchema = z.object({
  email: AccountSchema.shape.email,
  displayName: AccountSchema.shape.displayName,
});
