import assert from "node:assert/strict";
import { test } from "node:test";
import { api, attachments } from "../../src/http.ts";
import { downloadAttachment, uploadAttachment } from "../../src/attachments.ts";
test("exports the clients and the attachment helpers", () => {
  assert.equal(typeof api.get, "function");
  assert.equal(typeof attachments.get, "function");
  assert.equal(typeof downloadAttachment, "function");
  assert.equal(typeof uploadAttachment, "function");
});
