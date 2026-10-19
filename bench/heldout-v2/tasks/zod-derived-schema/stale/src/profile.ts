import { AccountSchema } from "./account.ts";

export const ProfileSchema = AccountSchema.pick({ email: true, displayName: true });
