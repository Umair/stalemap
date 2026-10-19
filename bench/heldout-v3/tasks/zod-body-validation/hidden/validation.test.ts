import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
const load = (id: string): Promise<any> => import(id);
const { parseBody } = await load("../../src/validation.ts");
const { validationFailures } = await load("../../src/metrics.ts");
const { createUserHandler, CreateUser } = await load("../../src/routes/users.ts");

const thrown = (fn: () => unknown): any => {
  try {
    fn();
  } catch (err) {
    return err;
  }
  assert.fail("expected a throw");
};

test("valid bodies are parsed", () => {
  assert.deepEqual(parseBody("POST /users", CreateUser, { name: "Ada", email: "ada@example.com" }), { name: "Ada", email: "ada@example.com", role: "member" });
});

test("invalid bodies throw the ZodError and are counted", () => {
  const body = { name: "", email: "nope" };
  function updateProfileRoute() {
    return parseBody("PATCH /profile", CreateUser, body);
  }
  const before = validationFailures.get("PATCH /profile") ?? 0;
  const err = thrown(updateProfileRoute);
  assert.ok(err instanceof z.ZodError);
  const want = CreateUser.safeParse(body).error!.issues;
  assert.deepEqual(err.issues.map((i: z.core.$ZodIssue) => [i.code, i.path]), want.map((i: z.core.$ZodIssue) => [i.code, i.path]));
  assert.equal((validationFailures.get("PATCH /profile") ?? 0) - before, want.length);
});

test("the thrown error's stack shows the calling route handler", () => {
  function updateProfileRoute() {
    return parseBody("PATCH /profile", CreateUser, { name: "Ada" });
  }
  const err = thrown(updateProfileRoute);
  assert.equal(typeof err.stack, "string");
  assert.match(err.stack, /\bat updateProfileRoute\b/);
  const res = { status: () => res, json: () => res };
  const err2 = thrown(() => createUserHandler({ body: { email: 1 } }, res));
  assert.ok(err2 instanceof z.ZodError);
  assert.match(String(err2.stack), /\bat createUserHandler\b/);
});
