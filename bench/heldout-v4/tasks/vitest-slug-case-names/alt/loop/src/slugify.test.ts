import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { slugify } from "./slugify.ts";

const fixtures: { input: string; slug: string }[] = JSON.parse(readFileSync(new URL("./fixtures/slugs.json", import.meta.url), "utf8"));

test("slugify 'Hello World'", () => {
  expect(slugify("Hello World")).toBe("hello-world");
});

test("slugify 'Release Notes v2.1'", () => {
  expect(slugify("Release Notes v2.1")).toBe("release-notes-v2-1");
});

for (const { input, slug } of fixtures) {
  test(`slugify '${input}'`, () => {
    expect(slugify(input)).toBe(slug);
  });
}
