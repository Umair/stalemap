import { expect, test } from "vitest";
import { loadDraft, saveDraft } from "./drafts.ts";

test("drafts round-trip", () => {
  saveDraft("a", "hello");
  expect(loadDraft("a")).toBe("hello");
  expect(loadDraft("missing")).toBeNull();
});
