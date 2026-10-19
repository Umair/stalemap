import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { ThemeOverrides } = await load("../../src/theme.ts");

const base = { "--brand": "#0a84ff", "--radius": "6px" };
const parse = (input: unknown) => ThemeOverrides.safeParse(input);

test("the required tokens and extra custom properties are accepted and kept", () => {
  assert.deepEqual(parse(base).data, base);
  const extended = { ...base, "--sidebar-width": "240px", "--font-body": "Inter, sans-serif" };
  const r = parse(extended);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, extended);
});

test("bad or missing values are rejected", () => {
  assert.equal(parse({ ...base, "--brand": "blue" }).success, false, "--brand must be a hex color");
  assert.equal(parse({ ...base, "--radius": "round" }).success, false, "--radius must be a length");
  assert.equal(parse({ "--brand": "#fff" }).success, false, "--radius is required");
  assert.equal(parse({ ...base, "--gap": 4 }).success, false, "custom property values are strings");
});

test("keys that aren't custom properties fail validation", () => {
  for (const key of ["brand", "radius", "-gap", "sidebarWidth"]) {
    const r = parse({ ...base, [key]: "#ffffff" });
    assert.equal(r.success, false, `${key} is rejected, not dropped`);
  }
});
