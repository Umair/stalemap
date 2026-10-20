import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

const load = (id: string): Promise<any> => import(id);

async function withServer(maxPhotos: string | undefined, fn: (url: string) => Promise<void>) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.MAX_PHOTOS_PER_UPLOAD;
  if (maxPhotos !== undefined) env.MAX_PHOTOS_PER_UPLOAD = maxPhotos;
  const saved = process.env.MAX_PHOTOS_PER_UPLOAD;
  if (maxPhotos === undefined) delete process.env.MAX_PHOTOS_PER_UPLOAD;
  else process.env.MAX_PHOTOS_PER_UPLOAD = maxPhotos;
  try {
    const { createApp } = await load("../../src/app.ts");
    const app = createApp(env);
    const server: Server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    try {
      await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    if (saved === undefined) delete process.env.MAX_PHOTOS_PER_UPLOAD;
    else process.env.MAX_PHOTOS_PER_UPLOAD = saved;
  }
}

function photos(n: number) {
  const f = new FormData();
  for (let i = 0; i < n; i++) f.append("photos", new Blob([new Uint8Array(100 + i)], { type: "image/jpeg" }), `IMG_${i}.jpg`);
  return f;
}

const upload = (url: string, album: string, n: number) => fetch(`${url}/api/albums/${album}/photos`, { method: "POST", body: photos(n) });

test("self-hosted installs (MAX_PHOTOS_PER_UPLOAD unset) accept any number of photos", async () => {
  await withServer(undefined, async (url) => {
    const res = await upload(url, "holiday", 12);
    assert.equal(res.status, 201);
    const added = await res.json();
    assert.equal(added.length, 12);
    assert.equal(added[11].name, "IMG_11.jpg");
    assert.equal(added[11].bytes, 111);
    const list = await fetch(`${url}/api/albums/holiday/photos`);
    assert.equal((await list.json()).length, 12);
  });
});

test("hosted plans keep their MAX_PHOTOS_PER_UPLOAD cap", async () => {
  await withServer("3", async (url) => {
    assert.equal((await upload(url, "a", 3)).status, 201);
    assert.equal((await upload(url, "a", 4)).status, 413);
  });
});
