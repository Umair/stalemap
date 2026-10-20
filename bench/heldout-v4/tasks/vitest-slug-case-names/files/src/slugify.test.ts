import { expect, test } from "vitest";
import { slugify } from "./slugify.ts";

test("slugify 'Hello World'", () => {
  expect(slugify("Hello World")).toBe("hello-world");
});

test("slugify 'Release Notes v2.1'", () => {
  expect(slugify("Release Notes v2.1")).toBe("release-notes-v2-1");
});
