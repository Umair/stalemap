import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { guideNotes, guideScore, targetMajors } from "../src/guides.ts";
import type { Packument } from "../src/registry.ts";

test("targetMajors covers every major after the baseline, or the pinned one for a minor jump", () => {
  assert.deepEqual(targetMajors("15.4.0", "16.4.2"), [16]);
  assert.deepEqual(targetMajors("4.3.16", "7.0.142"), [5, 6, 7]);
  assert.deepEqual(targetMajors("4.0.5", "4.3.1"), [4]);
});

test("guideScore finds version guides and skips copies, translations and fixtures", () => {
  const m16 = [16];
  assert.ok(guideScore("docs/01-app/02-guides/upgrading/version-16.mdx", m16) > 0);
  assert.ok(guideScore("docs/01-app/02-guides/upgrading/version-16.mdx", m16) > guideScore("docs/02-pages/02-guides/upgrading/version-16.mdx", m16), "the pages-router copy ranks lower");
  assert.equal(guideScore("docs/01-app/02-guides/upgrading/version-15.mdx", m16), 0, "another major");
  assert.equal(guideScore("docs/zh-cn/guides/upgrading/version-16.mdx", m16), 0, "translations");
  assert.equal(guideScore("test/fixtures/upgrading/version-16.md", m16), 0, "fixtures");
  assert.equal(guideScore("docs/guides/upgrading/version-16.ts", m16), 0, "not markdown");
  assert.ok(guideScore("content/docs/08-migration-guides/24-migration-guide-6-0.mdx", [5, 6, 7]) > 0);
  assert.ok(guideScore("packages/documentation/copy/en/release-notes/TypeScript 6.0.md", [6]) > 0);
  assert.equal(guideScore("packages/ai/CHANGELOG.md", [7]), 0, "a changelog without a version in its path");
});

test("guide notes come from the guide, keep only quoted ones, and are cached for cache-only callers", async () => {
  process.env.STALEMAP_CACHE = await mkdtemp(join(tmpdir(), "stalemap-guides-"));
  const guide = "# Upgrading to v2\n\nThe `retries` option now defaults to `3` (it was `0`). Set `retries: 0` to keep the old behavior.\n";
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => {
    const u = String(url);
    if (u.endsWith("/git/trees/HEAD")) return Response.json({ tree: [{ path: "docs", type: "tree", sha: "d1" }] });
    if (u.includes("/git/trees/d1")) return Response.json({ tree: [{ path: "guides/upgrading-to-v2.md", type: "blob", sha: "b1" }, { path: "guides/upgrading-to-v1.md", type: "blob", sha: "b0" }] });
    if (u.endsWith("/docs/guides/upgrading-to-v2.md")) return new Response(guide);
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  try {
    const p = { name: "lib", repository: "https://github.com/acme/lib", versions: {}, time: {} } as unknown as Packument;
    let calls = 0;
    const provider = {
      name: "claude-code" as const,
      complete: async (_model: string, prompt: string) => {
        calls++;
        assert.match(prompt, /acme\/lib\/docs\/guides\/upgrading-to-v2\.md/);
        return JSON.stringify({
          notes: [
            { text: "`retries` now defaults to `3` (was `0`); set `retries: 0` to keep the old behavior.", kind: "default", keys: ["retries"], quote: "now defaults to `3`" },
            { text: "An invented change the guide never mentions at all.", kind: "behavior", keys: ["x"], quote: "this sentence is not in the guide" },
          ],
        });
      },
    };
    const opts = { p, from: "1.4.0", to: "2.1.0", known: [], model: "m", max: 8, useCache: true };
    const notes = await guideNotes({ ...opts, provider });
    assert.equal(notes.length, 1, "the note whose quote isn't in the guide is dropped");
    assert.equal(notes[0].kind, "default");
    assert.deepEqual(notes[0].keys, ["retries"]);
    assert.equal(notes[0].source, "docs/guides/upgrading-to-v2.md");
    // Cache only (the guard): same notes, no model call and no network.
    globalThis.fetch = (async () => {
      throw new Error("no network in cache-only mode");
    }) as typeof fetch;
    assert.deepEqual(await guideNotes(opts), notes);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.STALEMAP_CACHE;
  }
});
