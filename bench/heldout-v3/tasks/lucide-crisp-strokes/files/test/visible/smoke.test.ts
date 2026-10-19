import assert from "node:assert/strict";
import { test } from "node:test";
import { AppIcon } from "../../src/icons/AppIcon.tsx";
import { EmptyState } from "../../src/components/EmptyState.tsx";
import { NavLink } from "../../src/components/NavLink.tsx";
test("exports AppIcon, EmptyState and NavLink", () => {
  assert.equal(typeof AppIcon, "function");
  assert.equal(typeof EmptyState, "function");
  assert.equal(typeof NavLink, "function");
});
