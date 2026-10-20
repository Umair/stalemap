import { createVitest } from "vitest/node";

/**
 * Full names ("suite > test") of every test in the Vitest project at `root`, for our test catalog page.
 */
export async function listTests(root: string): Promise<string[]> {
  const vitest = await createVitest("test", { root, watch: false });
  try {
    const { testModules } = await vitest.collect();
    const names: string[] = [];
    for (const module of testModules) for (const test of module.children.allTests()) names.push(test.fullName);
    return names;
  } finally {
    await vitest.close();
  }
}
