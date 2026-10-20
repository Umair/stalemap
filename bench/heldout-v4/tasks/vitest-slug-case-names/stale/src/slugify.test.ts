import { expect, test } from "vitest";
import { slugify } from "./slugify.ts";
import slugs from "./fixtures/slugs.json" with { type: "json" };

test("slugify 'Hello World'", () => {
  expect(slugify("Hello World")).toBe("hello-world");
});

test("slugify 'Release Notes v2.1'", () => {
  expect(slugify("Release Notes v2.1")).toBe("release-notes-v2-1");
});

test.each(slugs)("slugify $input", ({ input, slug }) => {
  expect(slugify(input)).toBe(slug);
});
