import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

async function withServer(fn: (url: string) => Promise<void>) {
  const { createApp } = await load("../../src/app.ts");
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function form(fields: number, files: number) {
  const f = new FormData();
  for (let i = 0; i < fields; i++) f.append(`tag${i}`, `value ${i}`);
  for (let i = 0; i < files; i++) f.append("contacts", new Blob([`name,email\nA${i},a${i}@example.com\n`], { type: "text/csv" }), `list-${i}.csv`);
  return f;
}

const post = (url: string, body: FormData) => fetch(`${url}/api/imports`, { method: "POST", body });

test("a request with exactly 8 parts is imported", async () => {
  await withServer(async (url) => {
    const mixed = await post(url, form(3, 5));
    assert.equal(mixed.status, 201);
    const json = await mixed.json();
    assert.equal(json.files.length, 5);
    assert.equal(json.fields.tag2, "value 2");
    assert.equal((await post(url, form(8, 0))).status, 201);
    assert.equal((await post(url, form(0, 8))).status, 201);
  });
});

test("a request with more than 8 parts is refused with 413", async () => {
  await withServer(async (url) => {
    assert.equal((await post(url, form(3, 6))).status, 413);
    assert.equal((await post(url, form(9, 0))).status, 413);
    assert.equal((await post(url, form(1, 8))).status, 413);
  });
});

test("small imports still work", async () => {
  await withServer(async (url) => {
    const res = await post(url, form(1, 1));
    assert.equal(res.status, 201);
    assert.deepEqual((await res.json()).files, [{ field: "contacts", name: "list-0.csv", bytes: "name,email\nA0,a0@example.com\n".length }]);
  });
});
