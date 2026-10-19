import assert from "node:assert/strict";
import { test } from "node:test";
import { generateText } from "ai";
import * as mod from "../../src/testing.ts";
const fakeModel = (mod as Record<string, any>).fakeModel;
test("generateText answers with the reply", async () => {
  const model = fakeModel("Hi there");
  assert.equal((await generateText({ model, prompt: "Say hi" })).text, "Hi there");
  assert.equal((await generateText({ model, prompt: "Again" })).text, "Hi there", "works for more than one call");
  assert.equal((await generateText({ model: fakeModel("Bye"), prompt: "Say bye" })).text, "Bye");
});
