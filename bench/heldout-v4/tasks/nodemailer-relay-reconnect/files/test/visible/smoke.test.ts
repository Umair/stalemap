import assert from "node:assert/strict";
import { test } from "node:test";
import { Relay } from "../../src/relay.ts";
test("exports the relay client", () => {
  assert.equal(typeof Relay, "function");
  const relay = new Relay({ host: "127.0.0.1", port: 2525 });
  assert.equal(typeof relay.open, "function");
  assert.equal(typeof relay.send, "function");
  assert.equal(typeof relay.close, "function");
});
