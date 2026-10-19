import assert from "node:assert/strict";
import { test } from "node:test";
import type { PackageReport } from "../src/analyze.ts";
import { buildPackageNotes } from "../src/render.ts";
import type { TypeChange } from "../src/typediff.ts";

function report(used: boolean, changes: TypeChange[], changelog: string[] = []): PackageReport {
  return {
    name: "lib",
    status: "changed",
    pinned: "2.0.0",
    baseline: { version: "1.0.0", publishedAt: "" },
    major: true,
    used,
    usedNames: [],
    files: [],
    changelog: { source: "package CHANGELOG", versions: ["2.0.0"], items: changelog.map((text) => ({ version: "2.0.0", text, raw: text, score: 8 })) },
    types: { analyzed: ["."], noTypes: false, changes },
  };
}

const params = (symbol: string, removed: string[], added: string[], used = true): TypeChange => ({
  subpath: ".",
  symbol,
  kind: "params",
  detail: `\`${symbol}()\` options no longer accept ${removed.map((o) => `\`${o}\``).join(", ")}`,
  used,
  severity: 8,
  meta: { removedOptions: removed, addedOptions: added },
});

test("removed options name their successors from changelog renames, shared words and co-mentions", () => {
  const notes = buildPackageNotes(
    report(true, [params("streamText", ["maxTokens", "maxSteps"], ["maxOutputTokens", "stopWhen", "toolOrder"])], [
      "rename continueUntil to stopWhen; replaces maxSteps",
    ]),
    4,
  );
  const text = notes.bullets[0].text;
  assert.match(text, /use `maxOutputTokens` instead of `maxTokens`/);
  assert.match(text, /new options include `stopWhen`/);
  assert.doesNotMatch(text, /toolOrder/, "unrelated new options aren't suggested");
});

test("identical option removals across functions are merged into one note", () => {
  const changes = ["string", "number", "boolean"].map((f) => params(f, ["required_error"], []));
  const notes = buildPackageNotes(report(true, changes), 4);
  assert.equal(notes.bullets.length, 1);
  assert.match(notes.bullets[0].text, /^`string\(\)`, `number\(\)`, `boolean\(\)` options no longer accept `required_error`/);
});

test("for a dependency the code doesn't import, only changes the changelog backs up are listed", () => {
  const removed = (symbol: string): TypeChange => ({ subpath: ".", symbol, kind: "removed", detail: `\`${symbol}\` was removed`, used: false, severity: 9 });
  const notes = buildPackageNotes(
    report(false, [removed("CoreMessage"), removed("internalHelper"), params("streamText", ["maxSteps"], [], false)], [
      "rename CoreMessage to ModelMessage",
      "streamText: remove maxSteps",
    ]),
    0,
  );
  const texts = notes.bullets.map((b) => b.text).join("\n");
  assert.match(texts, /CoreMessage/);
  assert.match(texts, /streamText\(\)/);
  assert.doesNotMatch(texts, /internalHelper.*was removed\. \[/, "an internal export nobody mentions isn't a headline note");
});

const removed = (symbol: string, used = false): TypeChange => ({ subpath: ".", symbol, kind: "removed", detail: `\`${symbol}\` was removed`, used, severity: 9 });
const item = (text: string, score: number, heading?: string) => ({ version: "2.0.0", text, raw: text, score, heading });
function withItems(r: PackageReport, items: ReturnType<typeof item>[]): PackageReport {
  return { ...r, changelog: { source: "package CHANGELOG", versions: ["2.0.0"], items } };
}

test("with the guard on, what still type-checks comes before removals the guard reports", () => {
  const r = withItems(report(true, [removed("oldThing", true)]), [
    item("bump default `cacheTTL` from 1 min to 4 hours", 6),
    item("`datasource.url` is now configured in the config file", 2, "Schema changes"),
    item("[Breaking] Remove deprecated `legacyFlag`", 10),
    item("Fix a typo in the docs", 0),
  ]);
  const plain = buildPackageNotes(r, 4).bullets.map((b) => b.text);
  assert.match(plain[0], /`oldThing` was removed/, "without the guard, the used removal leads");
  const guarded = buildPackageNotes(r, 4, undefined, { guard: true }).bullets;
  const order = guarded.map((b) => b.text);
  assert.ok(order.indexOf("bump default `cacheTTL` from 1 min to 4 hours.") < order.findIndex((t) => /oldThing/.test(t)), order.join("\n"));
  assert.ok(order.some((t) => t.startsWith("`datasource.url` is now configured")), order.join("\n"));
  const removal = order.findIndex((t) => t.startsWith("[Breaking] Remove deprecated `legacyFlag`"));
  assert.ok(removal > order.indexOf("bump default `cacheTTL` from 1 min to 4 hours."), "a removal ranks after a changed default");
  assert.ok(!order.some((t) => /typo/.test(t)));
});

test("with the guard on, a heading's one-liner gives way to the body that explains it", () => {
  const heading = "⚠️ `.pick()` disallowed on refined schemas";
  const r = withItems(report(false, []), [
    item("`.pick()` disallowed on refined schemas", 6, heading),
    item("Using `.pick()` on object schemas with refinements now throws an error. Previously, this would silently drop the refinements.", 6, heading),
  ]);
  const texts = buildPackageNotes(r, 4, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.equal(texts.length, 1);
  assert.match(texts[0], /^Using `\.pick\(\)`/);
});

test("deprecated compiler options get one note when the project has a tsconfig.json", () => {
  const deprecated = (symbol: string, members: string[]): TypeChange => ({
    subpath: ".", symbol, kind: "deprecated", detail: `On \`${symbol}\`, deprecated: ${members.map((m) => `\`${m}\``).join(", ")}`, used: false, severity: 4, meta: { members },
  });
  const ts: PackageReport = { ...report(false, [deprecated("CompilerOptions", ["baseUrl", "downlevelIteration"]), deprecated("ModuleResolutionKind", ["Classic", "Node10"])]), name: "typescript", pinned: "6.0.3", baseline: { version: "5.8.3", publishedAt: "" } };
  assert.ok(!buildPackageNotes(ts, 4).bullets.some((b) => /Compiler options/.test(b.text)), "no tsconfig.json, no note");
  const notes = buildPackageNotes({ ...ts, tsconfig: { options: { baseUrl: ".", moduleResolution: "node10" } } }, 4).bullets;
  assert.equal(notes[0].text, "Compiler options deprecated in TypeScript 6.0.3 (`tsc` fails on them, TS5101/TS5107, unless tsconfig.json sets `\"ignoreDeprecations\": \"6.0\"`): `baseUrl`, `downlevelIteration`; `moduleResolution`: `classic`, `node10`. This project's tsconfig.json sets `baseUrl`, `moduleResolution: node10`.");
  assert.ok(!notes.some((b) => b.text.startsWith("On `CompilerOptions`")), "the generic deprecation note is folded in");
});

test("a removed export with a higher-versioned sibling names it as the replacement", () => {
  const added = (symbol: string): TypeChange => ({ subpath: "./test", symbol, kind: "added", detail: `\`${symbol}\``, used: false, severity: 1 });
  const r = report(false, [{ ...removed("MockLanguageModelV1"), subpath: "./test" }, added("MockLanguageModelV3"), added("MockLanguageModelV4")]);
  const texts = buildPackageNotes({ ...r, name: "ai" }, 4).bullets.map((b) => b.text);
  assert.ok(texts.includes("`MockLanguageModelV1` was removed; use `MockLanguageModelV4` (in `ai/test`)."), texts.join("\n"));
});

test("guide notes that name what the project uses come first; a changed default the project sets is skipped", () => {
  const r = report(true, []);
  r.usedNames = ["images", "strict"];
  r.files = ["next.config.ts"];
  r.guideNotes = [
    { text: "An unrelated note about `telemetry`.", kind: "behavior", keys: ["telemetry"], quote: "q", source: "s" },
    { text: "`images.qualities` now defaults to `[75]`.", kind: "default", keys: ["images.qualities"], quote: "q", source: "s" },
    { text: "`strict` now defaults to `true`.", kind: "default", keys: ["strict"], quote: "q", source: "s" },
    { text: "`middleware.ts` is now `proxy.ts`.", kind: "convention", keys: ["middleware.ts"], quote: "q", source: "s" },
  ];
  const texts = buildPackageNotes(r, 4).bullets.filter((b) => b.tag === "guide").map((b) => b.text);
  assert.equal(texts[0], "`images.qualities` now defaults to `[75]`.", "the project sets `images` but not `qualities`");
  assert.ok(!texts.some((t) => t.includes("`strict`")), "the project sets `strict` itself");
  assert.ok(texts.includes("An unrelated note about `telemetry`."), "unrelated notes still make it, after the related ones");
});

test("each project gets the notes about its own code: config keys, entry points, props", () => {
  const items = [
    "[Breaking] Remove the deprecated `experimental.turbo` config object",
    "[Breaking] feat(next/image)!: add support for `images.maximumRedirects`",
    "[Breaking] Remove `amp` support",
    "[breaking]: enable router scroll optimization by default",
    "[breaking]: enable clientSegmentCache by default",
    "[Breaking] Update default browserslist config",
    "[Breaking] Use Flat config by default",
    "[Breaking] Change the default for something else by default",
  ];
  const base = { ...report(true, []), changelog: { source: "GitHub releases" as const, versions: ["2.0.0"], items: items.map((text, i) => ({ version: "2.0.0", text, raw: text, score: i < 3 ? 3 : 9 })) } };
  const plain = buildPackageNotes(base, 2, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.ok(!plain.some((t) => /turbo|maximumRedirects/.test(t)), plain.join("\n"));
  const turbo = buildPackageNotes({ ...base, usedNames: ["NextConfig", "experimental", "experimental.turbo"], files: ["next.config.ts"] }, 2, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.match(turbo[0], /experimental\.turbo/, turbo.join("\n"));
  const image = buildPackageNotes({ ...base, usedNames: ["NextConfig", "images"], entries: ["lib/image", "next/image"], files: ["app/page.tsx"] }, 2, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.match(image[0], /maximumRedirects/, image.join("\n"));
  assert.ok(!image.some((t) => /experimental\.turbo/.test(t)), image.join("\n"));
});

test("a package used only through its config: its option changes first, the project's own options all named", () => {
  const removed = (symbol: string): TypeChange => ({ subpath: ".", symbol, kind: "removed", detail: `\`${symbol}\` was removed`, used: symbol === "CompilerOptions", severity: 9 });
  const r: PackageReport = {
    ...report(true, [
      removed("CompilerOptions"),
      removed("tokenToString"),
      removed("createProgram"),
      {
        subpath: ".",
        symbol: "CompilerOptions",
        kind: "members",
        detail: "`CompilerOptions` (now in `x/api`): removed `a1`, `a2`",
        used: true,
        severity: 6,
        meta: { members: ["allowSyntheticDefaultImports", "alwaysStrict", "baseUrl", "charset", "downlevelIteration", "esModuleInterop", "keyofStringsOnly", "out", "outFile", "suppressImplicitAnyIndexErrors"] },
      },
    ]),
    name: "typescript",
    usedNames: ["CompilerOptions", "strict", "outFile", "esModuleInterop"],
    files: ["tsconfig.json"],
  };
  const bullets = buildPackageNotes(r, 4, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.equal(bullets[0], "`CompilerOptions` options removed: `esModuleInterop`, `outFile` (this project sets them); also `allowSyntheticDefaultImports`, `alwaysStrict`, `baseUrl`, `charset`, `downlevelIteration`, `keyofStringsOnly`, `out`, `suppressImplicitAnyIndexErrors`.");
  assert.ok(!bullets.some((t) => t.startsWith("Also removed")), "its JS API isn't listed for a tsconfig user");
  // Imported as a library, the same package keeps its JS API notes.
  const lib = buildPackageNotes({ ...r, files: ["src/build.ts"], usedNames: ["createProgram"] }, 4, undefined, { guard: true }).bullets.map((b) => b.text);
  assert.ok(lib.some((t) => t.startsWith("Also removed")), lib.join("\n"));
});

test("moved config keys the project sets are all shown, ahead of the rest", () => {
  const movedKeys: Record<string, string> = {};
  for (const k of ["a", "b", "c", "d", "e", "f"]) movedKeys[`experimental.${k}`] = `use top-level \`${k}\``;
  const change: TypeChange = { subpath: ".", symbol: "NextConfig.experimental", kind: "deprecated", detail: "`NextConfig` config: …", used: true, severity: 7, meta: { members: Object.keys(movedKeys), movedKeys } };
  const plain = buildPackageNotes(report(true, [change]), 4).bullets[0].text;
  assert.match(plain, /\(\+3 more\)/);
  const mine = buildPackageNotes({ ...report(true, [change]), usedNames: ["experimental.e", "experimental.f"] }, 4).bullets[0].text;
  assert.match(mine, /: `experimental\.e` → `e`; `experimental\.f` → `f`; `experimental\.a` → `a` \(\+3 more\)/, mine);
});
