import assert from "node:assert/strict";
import { test } from "node:test";
import { Dashboard } from "../../src/Dashboard.tsx";
import { TallyCounter } from "../../src/TallyCounter.tsx";
import { mount } from "../../src/main.tsx";

test("exports Dashboard, TallyCounter and mount", () => {
  assert.equal(typeof Dashboard, "function");
  assert.equal(typeof TallyCounter, "function");
  assert.equal(typeof mount, "function");
});
