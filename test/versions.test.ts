import assert from "node:assert/strict";
import { test } from "node:test";
import { findModel, parseKnowledge, type ModelInfo } from "../src/models.ts";
import { chooseBaseline, resolveRange, versionsBetween, type Packument } from "../src/registry.ts";

test("parseKnowledge uses the last day of a month-only cutoff", () => {
  assert.equal(parseKnowledge("2026-06").toISOString().slice(0, 10), "2026-06-30");
  assert.equal(parseKnowledge("2025-02").toISOString().slice(0, 10), "2025-02-28");
  assert.equal(parseKnowledge("2025-07-31").toISOString().slice(0, 10), "2025-07-31");
});

const models: ModelInfo[] = [
  { id: "claude-opus-5-5", provider: "anthropic", family: "claude-opus", knowledge: "2026-06", releaseDate: "2026-09-22" },
  { id: "claude-opus-5", provider: "anthropic", family: "claude-opus", knowledge: "2026-05", releaseDate: "2026-07-24" },
  { id: "claude-sonnet-4-5-20250929", provider: "anthropic", family: "claude-sonnet", knowledge: "2025-07-31", releaseDate: "2025-09-29" },
  { id: "us.anthropic.claude-opus-5-5", provider: "amazon-bedrock", knowledge: "2026-06" },
];

test("findModel resolves aliases, provider prefixes and date suffixes", () => {
  assert.equal(findModel("opus", models)?.id, "claude-opus-5-5");
  assert.equal(findModel("claude-opus-5-5[1m]", models)?.id, "claude-opus-5-5");
  assert.equal(findModel("anthropic/claude-opus-5", models)?.id, "claude-opus-5");
  assert.equal(findModel("claude-sonnet-4-5", models)?.id, "claude-sonnet-4-5-20250929");
  assert.equal(findModel("us.anthropic.claude-opus-5-5", models)?.provider, "anthropic");
  assert.equal(findModel("gpt-nope", models), undefined);
});

const packument: Packument = {
  name: "lib",
  fetchedAt: 0,
  distTags: { latest: "3.1.0", next: "4.0.0-beta.1" },
  time: {
    "1.0.0": "2025-01-10T00:00:00Z",
    "2.0.0": "2025-05-01T00:00:00Z",
    "2.1.0": "2025-06-20T00:00:00Z", // within 30 days of a 2025-06-30 cutoff
    "2.2.0-rc.1": "2025-04-01T00:00:00Z",
    "1.9.9": "2025-05-15T00:00:00Z", // maintenance release of an older line
    "3.0.0": "2025-09-01T00:00:00Z",
    "3.1.0": "2025-10-01T00:00:00Z",
    "4.0.0-beta.1": "2025-11-01T00:00:00Z",
  },
  versions: Object.fromEntries(["1.0.0", "1.9.9", "2.0.0", "2.1.0", "2.2.0-rc.1", "3.0.0", "3.1.0", "4.0.0-beta.1"].map((v) => [v, { tarball: v }])),
};

test("chooseBaseline picks the newest stable release before cutoff minus margin", () => {
  const cutoff = new Date("2025-06-30T00:00:00Z");
  assert.equal(chooseBaseline(packument, cutoff, 30)?.version, "2.0.0");
  assert.equal(chooseBaseline(packument, cutoff, 0)?.version, "2.1.0");
  assert.equal(chooseBaseline(packument, new Date("2024-12-31"), 30), undefined);
});

test("resolveRange and versionsBetween", () => {
  assert.equal(resolveRange(packument, "^2.0.0"), "2.1.0");
  assert.equal(resolveRange(packument, "latest"), "3.1.0");
  assert.equal(resolveRange(packument, "next"), "4.0.0-beta.1");
  assert.deepEqual(versionsBetween(packument, "2.1.0", "4.0.0-beta.1"), ["2.2.0-rc.1", "3.0.0", "3.1.0", "4.0.0-beta.1"]);
});
