import assert from "node:assert/strict";
import { test } from "node:test";
import { listCommands, PluginRegistration } from "../../src/plugins.ts";
test("exports listCommands() and PluginRegistration", () => {
  assert.equal(typeof listCommands, "function");
  assert.equal(typeof PluginRegistration.parseAsync, "function");
});
