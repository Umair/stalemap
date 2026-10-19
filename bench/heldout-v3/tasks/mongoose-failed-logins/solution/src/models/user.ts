import { Schema, model, type HydratedDocument, type Model } from "mongoose";
import { verifyPassword } from "../passwords.ts";

export interface IUser {
  email: string;
  passwordHash: string;
  failedLogins: number;
  resetRequestedAt?: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  requestPasswordReset(): Promise<void>;
}

type UserModel = Model<IUser, {}, IUserMethods>;
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>({
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  failedLogins: { type: Number, default: 0 },
  resetRequestedAt: Date,
});

userSchema.method("comparePassword", function (candidate) {
  return new Promise<boolean>((resolve, reject) => {
    verifyPassword(candidate, this.passwordHash, (err, ok) => (err ? reject(err) : resolve(Boolean(ok))));
  });
});

userSchema.method("requestPasswordReset", async function () {
  this.resetRequestedAt = new Date();
  // The mailer picks up users with a fresh resetRequestedAt.
});

// Custom method names aren't in mongoose's hook typings, hence the cast.
userSchema.pre("requestPasswordReset" as any, function (this: UserDocument) {
  if (this.resetRequestedAt && Date.now() - this.resetRequestedAt.getTime() < 60_000) {
    throw new Error("A reset was requested less than a minute ago");
  }
});

userSchema.post("comparePassword" as any, function (this: UserDocument, ok: boolean) {
  this.failedLogins = ok ? 0 : this.failedLogins + 1;
});

export const User = model<IUser, UserModel>("User", userSchema);
