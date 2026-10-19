import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { checkLogin } = await load("../../src/auth.ts");
const { User } = await load("../../src/models/user.ts");
const { hashPasswordSync } = await load("../../src/passwords.ts");
// There is no database here. Saving is the login route's job, but a solution that also saves the user shouldn't hang on it.
User.prototype.save = async function () {
  return this;
};

test("wrong passwords are counted and a correct one resets the count", async () => {
  const user = new User({ email: "ada@example.com", passwordHash: hashPasswordSync("correct horse") });
  assert.equal(await checkLogin(user, "battery staple"), false);
  assert.equal(user.failedLogins, 1);
  assert.equal(await checkLogin(user, "Correct horse"), false);
  assert.equal(user.failedLogins, 2);
  assert.equal(await checkLogin(user, "correct horse"), true);
  assert.equal(user.failedLogins, 0);
});

test("a correct first login leaves the count at 0", async () => {
  const user = new User({ email: "grace@example.com", passwordHash: hashPasswordSync("hunter2") });
  assert.equal(await checkLogin(user, "hunter2"), true);
  assert.equal(user.failedLogins, 0);
});
