import assert from "node:assert/strict";
import { test } from "node:test";
import type { PackageReport } from "../src/analyze.ts";
import { projectUsage } from "../src/render.ts";
import { buildIndex, focusPackages, guideSections, reportDocs, searchIndex, snippet, stem, tokenize, type SearchDoc } from "../src/search.ts";

test("tokens: identifiers whole and split, words stemmed, stop words dropped", () => {
  assert.deepEqual(tokenize("Set experimental.turbopackPersistentCaching in the config"), ["set", "experimental.turbopackpersistentcaching", "experimental", "turbopack", "persistent", "cach", "config"]);
  assert.deepEqual(tokenize("resolve alias"), ["resolv", "alias"]);
  assert.ok(tokenize("`resolveAlias`").includes("alias"), "an identifier meets the words it's made of");
  assert.equal(stem("redirects"), stem("redirected"));
  assert.equal(stem("images"), stem("image"));
  assert.equal(stem("aliases"), stem("alias"));
  assert.ok(tokenize("next/legacy/image").includes("next/legacy/image"));
});

test("guides are split into sections under their heading path, long ones at paragraph breaks", () => {
  const md = `---\ntitle: Upgrading\n---\nimport { X } from "y";\n\n# Version 16\n\nIntro text that is long enough to be kept as its own section here.\n\n## Turbopack\n\n### Resolve alias\n\nUse \`turbopack.resolveAlias\` where you used webpack's \`resolve.alias\`, for example to stub a module.\n\n\`\`\`ts\n# not a heading\n\`\`\`\n`;
  const sections = guideSections(md, "docs/upgrading/version-16.mdx");
  assert.deepEqual(sections.map((s) => s.title), ["Version 16", "Version 16 › Turbopack › Resolve alias"]);
  assert.match(sections[1].text, /# not a heading/);
  const long = `# A\n\n${Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ${"word ".repeat(20)}`).join("\n\n")}`;
  const parts = guideSections(long, "x.md");
  assert.ok(parts.length > 1 && parts.every((p) => p.text.length <= 2900));
});

const doc = (pkg: string, text: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({ pkg, from: "1.0.0", to: "2.0.0", kind: "changelog", source: "release notes 2.0.0", text, ...extra });

test("old words find the new API: BM25 over split identifiers, boosted by what the project uses", () => {
  const docs = [
    doc("next", "Turbopack: put `resolveAlias` under the top-level `turbopack` key; `experimental.turbo` was removed.", { kind: "guide", source: "upgrade guide", title: "Turbopack › Resolve alias" }),
    doc("next", "Deprecate `middleware` and recommend `proxy`: rename `middleware.ts` to `proxy.ts`."),
    doc("next", "Fix a typo in the docs."),
    doc("zod", "`z.string()` options no longer accept `required_error`; use `error`.", { kind: "types", source: "type declarations" }),
    doc("next", "`App` changed: `render` …", { kind: "types", source: "type declarations", prior: 0.6 }),
  ];
  const index = buildIndex(docs);
  assert.match(searchIndex(index, "webpack resolve alias in next.config")[0].doc.text, /resolveAlias/);
  assert.match(searchIndex(index, "middleware that redirects")[0].doc.text, /proxy/);
  assert.match(searchIndex(index, "zod required error message")[0].doc.text, /required_error/);
  assert.equal(searchIndex(index, "zod required error message", { pkg: "next" }).every((h) => h.doc.pkg === "next"), true);
  assert.deepEqual(searchIndex(index, "the and of"), []);

  // Two docs equally about `render`: the one naming what the project uses wins.
  const tie = buildIndex([doc("next", "`render` now takes `options`."), doc("next", "`render` of `Image` now takes `options`.")]);
  const usage = new Map([["next", projectUsage({ name: "next", used: true, usedNames: ["Image"], files: ["app/page.tsx"], entries: ["next/image"] } as PackageReport)]]);
  assert.match(searchIndex(tie, "render options", { usage })[0].doc.text, /Image/);
});

test("the files a query names point at the packages they use", () => {
  const files = new Map([
    ["next", new Set(["app/components/ProductPhoto.tsx", "next.config.ts"])],
    ["zod", new Set(["src/schemas.ts"])],
  ]);
  assert.deepEqual([...focusPackages("Photos in `app/components/ProductPhoto.tsx` look blurry", files)], ["next"]);
  assert.deepEqual([...focusPackages("fix ./src/schemas.ts and next.config.ts", files)].sort(), ["next", "zod"]);
  assert.deepEqual([...focusPackages("no files here", files)], []);
});

test("a report becomes documents: notes, every type change, moved keys, every release note", () => {
  const r: PackageReport = {
    name: "next",
    status: "changed",
    pinned: "16.0.0",
    baseline: { version: "15.0.0", publishedAt: "" },
    major: true,
    used: false,
    usedNames: [],
    files: [],
    types: {
      analyzed: ["."],
      noTypes: false,
      changes: [
        { subpath: ".", symbol: "NextConfig.experimental", kind: "deprecated", detail: "`NextConfig` config: …", used: false, severity: 7, meta: { members: ["experimental.turbo"], movedKeys: { "experimental.turbo": "use top-level `turbopack`" } } },
        { subpath: "./server", symbol: "unstable_rootParams", kind: "removed", detail: "`unstable_rootParams` was removed", used: false, severity: 9 },
        { subpath: "./root-params", symbol: "lang", kind: "added", detail: "`lang`", used: false, severity: 1 },
      ],
    },
    changelog: { source: "GitHub releases", versions: ["16.0.0"], items: Array.from({ length: 30 }, (_, i) => ({ version: "16.0.0", text: `Change number ${i}`, raw: "", score: 1 })) },
  };
  const docs = reportDocs(r);
  assert.ok(docs.some((d) => d.text === "`NextConfig` key `experimental.turbo` moved: use top-level `turbopack`."));
  assert.ok(docs.some((d) => d.text.startsWith("`unstable_rootParams` was removed") && d.source === "type declarations (next/server)"));
  assert.ok(docs.some((d) => d.text === "New exports in `next/root-params` 16.0.0: `lang`."));
  assert.equal(docs.filter((d) => d.kind === "changelog" && /^Change number/.test(d.text)).length, 30, "every release note, not just the top-scored");
});

test("a long document is shown by its best part", () => {
  const text = Array.from({ length: 40 }, (_, i) => (i === 25 ? "Use `turbopack.resolveAlias` to stub `canvas`." : `Unrelated line ${i} about something else entirely.`)).join("\n");
  const s = snippet(text, tokenize("resolve alias canvas"));
  assert.match(s, /resolveAlias/);
  assert.ok(s.length < 1000);
});

test("a release-note section is one document, its code kept; one release's sections aren't capped together", async () => {
  const { reportDocs, searchIndex, buildIndex } = await import("../src/search.ts");
  const items = [
    { version: "4.5.0", heading: "⚠️ `z.iso.datetime()` requires seconds", raw: "⚠️ `z.iso.datetime()` requires seconds", text: "`z.iso.datetime()` requires seconds", score: 9, seq: 0 },
    { version: "4.5.0", heading: "⚠️ `z.iso.datetime()` requires seconds", raw: "RFC 3339 mandates seconds. `z.iso.datetime()` no longer accepts minute precision.", text: "RFC 3339 mandates seconds. `z.iso.datetime()` no longer accepts minute precision.", score: 6, seq: 1 },
    { version: "4.5.0", heading: "⚠️ `z.iso.datetime()` requires seconds", raw: "To accept both forms, union the two precisions:\n```ts\nz.union([z.iso.datetime(), z.iso.datetime({ precision: -1 })]);\n```", text: "To accept both forms, union the two precisions:", score: 0, seq: 2 },
    { version: "4.5.0", heading: "Other", raw: "- `z.email()` uses a stricter pattern", text: "`z.email()` uses a stricter pattern", score: 4, seq: 3 },
    { version: "4.5.0", heading: "More", raw: "- `z.url()` rejects spaces", text: "`z.url()` rejects spaces", score: 4, seq: 4 },
  ];
  const report: PackageReport = { name: "zod", status: "changed", pinned: "4.6.7", baseline: { version: "3.25.67", publishedAt: "" }, major: true, used: true, usedNames: [], files: [], changelog: { source: "GitHub releases", versions: ["4.5.0"], items } };
  const docs = reportDocs(report).filter((d) => d.source === "release notes 4.5.0");
  const section = docs.find((d) => d.text.includes("requires seconds"))!;
  assert.match(section.text, /RFC 3339 mandates seconds[\s\S]*To accept both forms[\s\S]*```\nz\.union\(\[z\.iso\.datetime\(\), z\.iso\.datetime\(\{ precision: -1 \}\)\]\);\n```/);
  assert.equal(docs.length, 3, "one section document, two separate bullets");
  const hits = searchIndex(buildIndex(docs), "zod 4.5.0 email url datetime", { limit: 8 });
  assert.equal(hits.length, 3, "three sections of one release all come back");
});

test("stemming joins -ion and -ing forms; `_id` stays whole", async () => {
  const { tokenize } = await import("../src/search.ts");
  assert.deepEqual(tokenize("intersection"), tokenize("intersecting"));
  assert.deepEqual(tokenize("validation"), tokenize("validated").map((t) => t));
  assert.deepEqual(tokenize("skip _id generation"), ["skip", "_id", "generat"]);
});
