import assert from "node:assert/strict";
import { test } from "node:test";
import { HelpWidget } from "../../src/HelpWidget.tsx";
import { mountHelpWidget } from "../../src/embed.tsx";
import { bindKey, isBound } from "../../src/keyboard.ts";

test("exports HelpWidget, mountHelpWidget and the keyboard helpers", () => {
  assert.equal(typeof HelpWidget, "function");
  assert.equal(typeof mountHelpWidget, "function");
  assert.equal(typeof bindKey, "function");
  assert.equal(typeof isBound, "function");
});
