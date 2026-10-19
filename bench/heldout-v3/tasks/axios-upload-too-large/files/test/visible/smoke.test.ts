import assert from "node:assert/strict";
import { test } from "node:test";
import { FileTooLargeError, NotSignedInError, uploadFile } from "../../src/upload.ts";
test("exports uploadFile() and its errors", () => {
  assert.equal(typeof uploadFile, "function");
  assert.equal(typeof FileTooLargeError, "function");
  assert.equal(typeof NotSignedInError, "function");
});
