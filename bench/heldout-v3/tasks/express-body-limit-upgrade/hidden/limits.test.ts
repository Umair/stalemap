import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

async function withServer(maxJsonBytes: string | undefined, fn: (url: string) => Promise<void>) {
  if (maxJsonBytes === undefined) delete process.env.MAX_JSON_BYTES;
  else process.env.MAX_JSON_BYTES = maxJsonBytes;
  const { createApp } = await load("../../src/app.ts");
  const app = createApp(process.env);
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (url: string, body: string) =>
  fetch(`${url}/api/notes`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "t", body }) });

test("self-hosted installs (MAX_JSON_BYTES unset) accept bodies of any size", async () => {
  await withServer(undefined, async (url) => {
    const big = "x".repeat(3 * 1024 * 1024);
    const res = await post(url, big);
    assert.equal(res.status, 201);
    assert.equal((await res.json()).length, big.length);
    const list = await fetch(`${url}/api/notes`);
    assert.deepEqual(await list.json(), [{ id: 1, title: "t" }]);
  });
});

test("hosted plans keep their MAX_JSON_BYTES cap", async () => {
  await withServer("2048", async (url) => {
    assert.equal((await post(url, "y".repeat(1000))).status, 201);
    assert.equal((await post(url, "z".repeat(4000))).status, 413);
  });
});
