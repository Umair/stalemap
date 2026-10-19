import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanItemText } from "../src/changelog.ts";
import type { PackageReport } from "../src/analyze.ts";
import { classifyChangelogItem, codeKeys, compileVisible, guardInvisible, identifiersIn, matchedKeys } from "../src/changes.ts";
import { editNotesFor } from "../src/editnotes.ts";
import type { TypeChange } from "../src/typediff.ts";

const item = (text: string, heading?: string) => ({ text, heading, raw: text });

test("release notes are classified by what the guard can't catch", () => {
  const cases: Array<[string, string | undefined, string[]]> = [
    ["BREAKING CHANGE!: bump default `images.minimumCacheTTL` from 1 min to 4 hours", undefined, ["breaking", "default"]],
    ["[breaking]: enable router scroll optimization by default", undefined, ["breaking", "default"]],
    ["Using `.pick()` on object schemas with refinements now throws an error.", "⚠️ `.pick()` disallowed", ["breaking", "behavior"]],
    ["generateSitemap passes id as promise", "Misc Changes", ["behavior"]],
    ["`datasource.url` is now configured in the config file", "Schema changes", ["config"]],
    ["[Breaking] Remove deprecated `unstable_rootParams`", undefined, ["breaking"]],
    ["Add a `foo` helper", "Minor Changes", []],
  ];
  for (const [text, heading, classes] of cases) assert.deepEqual(classifyChangelogItem(item(text, heading)).classes, classes, text);
  // A removal is breaking, but the compiler sees it; a changed default isn't.
  assert.equal(guardInvisible(classifyChangelogItem(item("[Breaking] Remove deprecated `unstable_rootParams`"))), false);
  assert.equal(guardInvisible(classifyChangelogItem(item("enable X by default"))), true);
  // "Major Changes" is every changeset major, not a statement that something breaks.
  assert.deepEqual(classifyChangelogItem(item("add `foo`", "Major Changes")).classes, []);
});

test("the compiler reports removals and renames once code uses them, not deprecations", () => {
  const c = (kind: TypeChange["kind"], extra: Partial<TypeChange> = {}): TypeChange => ({ subpath: ".", symbol: "x", kind, detail: "", used: false, severity: 9, ...extra });
  assert.equal(compileVisible(c("removed")), true);
  assert.equal(compileVisible(c("renamed")), true);
  assert.equal(compileVisible(c("params", { severity: 8 })), true);
  assert.equal(compileVisible(c("params", { severity: 1 })), false);
  assert.equal(compileVisible(c("members", { meta: { members: ["promptTokens"] } })), true);
  assert.equal(compileVisible(c("deprecated", { severity: 6 })), false);
  assert.equal(compileVisible(c("subpath", { severity: 7 })), false);
});

test("code names come from backticks, camelCase, dotted paths and entry points, not prose", () => {
  assert.deepEqual(codeKeys("BREAKING CHANGE!: bump default `images.minimumCacheTTL` from 1 min"), ["images.minimumCacheTTL"]);
  assert.deepEqual(codeKeys("Using `.pick()` or `.omit()` on object schemas"), ["pick", "omit"]);
  assert.deepEqual(codeKeys("generateSitemap passes id as promise"), ["generateSitemap"]);
  assert.deepEqual(codeKeys("next/image only allow quality 75 by default"), ["next/image"]);
  assert.deepEqual(codeKeys("Update next.config.js handling; the `null` option"), []);
});

test("edited text matches a note by the key, its object, or a singular/plural form, not by an entry point", () => {
  const ids = identifiersIn(`const config = { images: { remotePatterns: [] } };
export async function generateSitemaps() {}
datasource db { url = env("X") }
const P = A.pick({ email: true });`);
  assert.deepEqual(matchedKeys(["images.minimumCacheTTL", "next/image", "generateSitemap", "datasource.url", "pick", "omit", "config.experimental.ppr", "url"], ids), [
    "images.minimumCacheTTL",
    "generateSitemap",
    "datasource.url",
    "pick",
  ]);
});

test("changelog text loses entities, authors and commit hashes", () => {
  assert.equal(
    cleanItemText("Remove deprecated `workspace` option in favor of `projects` &nbsp;-&nbsp; by @hi-ogawa, **Hiroshi Ogawa** and **OpenAI Codex** in https://github.com/vitest-dev/vitest/issues/10522 [<samp>(76fb7)</samp>](https://github.com/vitest-dev/vitest/commit/76fb7)"),
    "Remove deprecated `workspace` option in favor of `projects`",
  );
});

test("edit-time notes skip list labels and notes that only name the package itself", () => {
  const items = [
    "reporters:; Write junit output to `.vitest` by default; `pool` now defaults to `forks`",
    "Write json reporter output files to `.vitest` by default",
    "`pool` now defaults to `forks`",
  ].map((text) => ({ version: "4.0.0", text, raw: text, score: 6 }));
  const r: PackageReport = { name: "vitest", status: "changed", major: true, used: true, usedNames: [], files: [], changelog: { source: "GitHub releases", versions: ["4.0.0"], items } };
  const notes = editNotesFor(`import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { pool: "threads" } });\n`, [r]);
  assert.deepEqual(notes.map((n) => n.text), ["`pool` now defaults to `forks` (changelog, 4.0.0)"]);
});
