import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanItemText, extractItems, isConventionalBreaking, parseChangelogSections, renamePairs, versionFromTag } from "../src/changelog.ts";

const CHANGESETS = `# ai

## 5.0.0

### Major Changes

- 92cb0a2: chore (ai): rename CoreMessage to ModelMessage
- 516be5b: remove \`maxSteps\` in favor of \`stopWhen\`

  A longer explanation
  - nested detail

### Patch Changes

- Updated dependencies [abc1234]
  - @ai-sdk/provider@2.0.0

## 4.3.16

### Patch Changes

- a1b2c3d: fix typo in docs
`;

test("parseChangelogSections splits by version heading", () => {
  const sections = parseChangelogSections(CHANGESETS);
  assert.deepEqual(sections.map((s) => s.version), ["5.0.0", "4.3.16"]);
  const keepAChangelog = parseChangelogSections("## [Unreleased]\n\n## [2.1.0] - 2026-01-02\n- Added x\n\n## v2.0.0 (2025-12-01)\n- Removed y\n");
  assert.deepEqual(keepAChangelog.map((s) => s.version), ["2.1.0", "2.0.0"]);
});

test("extractItems cleans entries, drops dependency bumps and ranks breaking changes", () => {
  const [major] = parseChangelogSections(CHANGESETS);
  const items = extractItems(major, new Set(["maxSteps"]));
  assert.equal(items.length, 2, "the 'Updated dependencies' entry is dropped");
  assert.equal(items[0].text, "rename CoreMessage to ModelMessage");
  assert.match(items[1].text, /^remove `maxSteps` in favor of `stopWhen` A longer explanation; nested detail$/);
  assert.ok(items[1].score > items[0].score, "mentions a used API");
});

test("cleanItemText strips commit links, PR refs and authors", () => {
  assert.equal(
    cleanItemText("[`3383e7e`](https://github.com/eslint/eslint/commit/3383e7e) fix!: remove deprecated `SourceCode` methods (#20137) (Pixel998)"),
    "remove deprecated `SourceCode` methods",
  );
  assert.equal(cleanItemText("[Breaking] Remove deprecated AMP: #84312"), "[Breaking] Remove deprecated AMP");
  assert.ok(isConventionalBreaking("`96512a6` fix!: Remove deprecated rule context methods"));
  assert.ok(!isConventionalBreaking("fix: something"));
});

test("versionFromTag only accepts the package's own tags", () => {
  assert.equal(versionFromTag("v16.4.2", "next"), "16.4.2");
  assert.equal(versionFromTag("ai@7.0.142", "ai"), "7.0.142");
  assert.equal(versionFromTag("@ai-sdk/openai@4.0.95", "ai"), undefined);
  assert.equal(versionFromTag("@tanstack/react-query@5.104.3", "@tanstack/react-query"), "5.104.3");
  assert.equal(versionFromTag("nightly", "next"), undefined);
});

test("renamePairs reads 'rename X to Y' announcements", () => {
  const [major] = parseChangelogSections(CHANGESETS);
  assert.deepEqual(renamePairs(extractItems(major, new Set())), [["CoreMessage", "ModelMessage"]]);
});

test("renamePairs reads config paths and 'deprecate X and recommend Y'", () => {
  const item = (text: string) => ({ version: "16.0.0", text, raw: text, score: 5 });
  assert.deepEqual(
    renamePairs([item("rename experimental.dynamicIO to experimental.cacheComponents"), item("Deprecate `middleware` and recommend `proxy`"), item("Deprecate the old router")]),
    [["experimental.dynamicIO", "experimental.cacheComponents"], ["middleware", "proxy"]],
  );
});

test("a CHANGELOG that stops before the pinned minor counts as lagging; pull request references are read from an item", async () => {
  const { lagsBehind, pullRequestRefs } = await import("../src/changelog.ts");
  assert.equal(lagsBehind([{ version: "1.19.0", body: "" }, { version: "1.18.0", body: "" }], "1.20.0"), true);
  assert.equal(lagsBehind([{ version: "1.20.0", body: "" }], "1.20.3"), false, "a patch behind is normal");
  assert.equal(lagsBehind([{ version: "1.19.0", body: "" }], "2.0.0-beta.1"), false, "prereleases aren't expected in a CHANGELOG");
  assert.deepEqual(pullRequestRefs("Hardened option reads; see the PR. (#11141) [#84391](https://github.com/vercel/next.js/pull/84391)"), [11141, 84391]);
});
