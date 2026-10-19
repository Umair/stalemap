import assert from "node:assert/strict";
import { test } from "node:test";
import type { UserInput } from "../../src/models/user.ts";
const load = (id: string): Promise<any> => import(id);

// The type follows the schema: every declared field, with the schema's types.
export const complete: UserInput = { email: "x@example.com", name: "X", roles: ["editor"], marketingOptIn: true, age: 40 };
// @ts-expect-error marketingOptIn is a Boolean in the schema
export const badOptIn: UserInput = { email: "x@example.com", name: "X", roles: [], marketingOptIn: "yes" };
// @ts-expect-error age is a Number in the schema
export const badAge: UserInput = { email: "x@example.com", name: "X", roles: [], marketingOptIn: false, age: "40" };
// @ts-expect-error roles is an array of strings in the schema
export const badRoles: UserInput = { email: "x@example.com", name: "X", roles: "admin", marketingOptIn: false };

test("seed users and signup data are valid users", async () => {
  const { User } = await load("../../src/models/user.ts");
  const { seedUsers } = await load("../../src/seed.ts");
  const { fromSignupForm } = await load("../../src/users.ts");
  assert.equal(seedUsers.length, 2);
  for (const input of [...seedUsers, fromSignupForm({ email: "Lin@Example.com ", name: "Lin" })]) {
    await new User(input).validate();
  }
});
