import { BaseAccountSchema } from "./account.ts";

export const ProfileSchema = BaseAccountSchema.pick({ email: true, displayName: true });
