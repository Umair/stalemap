import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
const load = (id: string): Promise<any> => import(id);
const { checkField } = await load("../../src/fieldCheck.ts");

test("valid values pass", async () => {
  assert.equal(await checkField("email", "ada@example.com"), null);
  assert.equal(await checkField("username", "ada_l"), null);
  assert.equal(await checkField("age", 30), null);
});

test("failing values resolve to the schema's message", async () => {
  assert.equal(await checkField("email", "ada.example.com"), "Enter a valid email address");
  assert.equal(await checkField("email", undefined), "Email is required");
  assert.equal(await checkField("username", "al"), "Usernames need at least 3 characters");
  assert.equal(await checkField("age", 12), "You must be at least 13");
});

test("async validators are awaited", async () => {
  assert.equal(await checkField("username", "Admin"), "That username is reserved");
  assert.equal(await checkField("username", "grace"), null);
});

test("no model is registered", () => {
  assert.deepEqual(mongoose.modelNames(), []);
});
