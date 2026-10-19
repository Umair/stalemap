import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/signup.ts";

const schema = (mod as Record<string, any>).SignupSchema;
const emailMessage = (input: unknown) => {
  const r = schema.safeParse(input);
  assert.equal(r.success, false);
  return r.error.issues.find((i: { path: unknown[] }) => i.path[0] === "email")?.message;
};

test("custom error messages", () => {
  assert.equal(emailMessage({ age: 30 }), "Email is required");
  assert.equal(emailMessage({ email: 5, age: 30 }), "Email must be text");
  assert.equal(emailMessage({ email: "nope", age: 30 }), "Invalid email");
  const young = schema.safeParse({ email: "a@b.co", age: 10 });
  assert.equal(young.success, false);
  assert.equal(young.error.issues[0].message, "Must be 18 or older");
  assert.equal(schema.safeParse({ email: "a@b.co", age: 30 }).success, true);
});
