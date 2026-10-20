import { expect, test } from "vitest";
import { platform } from "#platform";
import { saveDraft } from "./drafts.ts";

test("drafts are kept in localStorage in the browser", () => {
  expect(platform).toBe("browser");
  saveDraft("b", "from the editor");
  expect(window.localStorage.getItem("draft:b")).toBe("from the editor");
});
