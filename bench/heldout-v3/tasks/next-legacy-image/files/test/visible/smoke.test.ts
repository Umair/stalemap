import assert from "node:assert/strict";
import { test } from "node:test";
import { HeroBanner } from "../../app/components/HeroBanner.tsx";
import { ProductPhoto } from "../../app/components/ProductPhoto.tsx";
test("exports the image components", () => {
  assert.equal(typeof HeroBanner, "function");
  assert.equal(typeof ProductPhoto, "function");
});
