import assert from "node:assert/strict";
import { test } from "node:test";

test("teams module exports", async () => {
  const mod = await import("../../src/teams.ts");
  assert.equal(typeof mod.setMemberRole, "function");
  assert.equal(typeof mod.teamRef, "function");
});
