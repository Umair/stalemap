import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

// Probe tests dropped next to the project's own: each records which platform implementation and environment it got.
const probes: Record<string, string> = {
  "src/zz-probe.test.ts": `import { expect, test } from "vitest";
import { platform } from "#platform";
test("probe unit", () => { expect(platform).toBe("node"); expect(typeof window).toBe("undefined"); });
`,
  "src/zz-probe.dom.test.ts": `import { expect, test } from "vitest";
import { kv, platform } from "#platform";
test("probe dom", () => {
  expect(platform).toBe("browser");
  kv.set("probe", "1");
  expect(window.localStorage.getItem("probe")).toBe("1");
});
`,
};

test("unit and dom projects run their files with the right platform", async () => {
  for (const [file, code] of Object.entries(probes)) writeFileSync(join(root, file), code);
  const { startVitest } = await load("vitest/node");
  let vitest: any;
  const byProject: Record<string, { environment: string; files: Record<string, string> }> = {};
  try {
    vitest = await startVitest("test", [], { root, watch: false, reporters: [{}] }, {}, {});
    for (const p of vitest.projects) byProject[p.name] = { environment: p.config.environment, files: {} };
    for (const mod of vitest.state.getTestModules()) {
      const errors = [...mod.children.allTests()].filter((t: any) => t.result().state !== "passed").map((t: any) => `${t.name}: ${t.result().errors?.[0]?.message}`);
      byProject[mod.project.name].files[relative(root, mod.moduleId)] = errors.length ? errors.join("; ") : mod.state();
    }
  } finally {
    await vitest?.close();
    process.exitCode = 0;
    for (const file of Object.keys(probes)) rmSync(join(root, file), { force: true });
  }
  assert.deepEqual(byProject, {
    unit: { environment: "node", files: { "src/drafts.test.ts": "passed", "src/zz-probe.test.ts": "passed" } },
    dom: { environment: "jsdom", files: { "src/drafts.dom.test.ts": "passed", "src/zz-probe.dom.test.ts": "passed" } },
  });
});
