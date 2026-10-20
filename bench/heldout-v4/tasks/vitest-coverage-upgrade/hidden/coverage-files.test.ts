import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url)).replace(/\/$/, "");
const load = (id: string): Promise<any> => import(id);

const expected: Record<string, boolean> = {
  "src/lib/math.ts": true,
  "src/api/users.ts": true,
  "src/components/button.ts": true,
  "src/components/forms/validators.ts": true,
  "src/api/generated/client.ts": false,
  "src/api/generated/models/user.ts": false,
  "src/components/button.stories.ts": false,
  "src/components/forms/validators.stories.ts": false,
  "src/lib/math.test.ts": false,
  "vitest.config.ts": false,
};

test("coverage includes the app's source files and leaves out generated code, stories and tests", async () => {
  // Vitest's own coverage file filter (the one the v8 and istanbul providers use), with the project's resolved config.
  const { createVitest, BaseCoverageProvider } = await load("vitest/node");
  const vitest = await createVitest("test", { root, watch: false }, {}, {});
  const actual: Record<string, boolean> = {};
  try {
    class Provider extends BaseCoverageProvider {
      name = "v8";
      version = vitest.version;
    }
    const provider = new Provider();
    provider._initialize(vitest);
    for (const file of Object.keys(expected)) actual[file] = provider.isIncluded(`${root}/${file}`);
  } finally {
    await vitest.close();
  }
  assert.deepEqual(actual, expected);
});
