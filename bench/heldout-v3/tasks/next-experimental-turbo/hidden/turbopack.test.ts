import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
// Every module an alias entry can point to (plain, conditional or list form).
const targets = (value: unknown): unknown[] =>
  Array.isArray(value) ? value.flatMap(targets) : value && typeof value === "object" ? Object.values(value).flatMap(targets) : [value];
const resolvable = (target: unknown): boolean => {
  if (target === false) return true;
  if (typeof target !== "string") return false;
  if (target.startsWith(".") || isAbsolute(target)) return existsSync(isAbsolute(target) ? target : join(root, target));
  try {
    createRequire(join(root, "package.json")).resolve(target);
    return true;
  } catch {
    return false;
  }
};
test("Turbopack resolves the canvas import to an empty module in dev and build", async () => {
  // Resolve the config with Next's own loader, as `next dev` and `next build` do.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  for (const phase of [PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD]) {
    const config = await loadConfig(phase, root, { silent: true });
    const alias = config.turbopack?.resolveAlias ?? {};
    assert.ok(Object.hasOwn(alias, "canvas"), `Turbopack aliases 'canvas' (${phase})`);
    const to = targets(alias.canvas);
    assert.ok(to.length > 0 && to.every(resolvable), `the canvas alias points to a module that exists (${phase})`);
    assert.equal(config.reactStrictMode, true, "the existing settings are kept");
  }
});
