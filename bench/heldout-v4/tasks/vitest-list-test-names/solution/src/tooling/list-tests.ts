import { createVitest } from "vitest/node";

/**
 * Full names ("suite > test") of every test in the Vitest project at `root`, for our test catalog page.
 */
export async function listTests(root: string): Promise<string[]> {
  const vitest = await createVitest("test", { root, watch: false });
  try {
    const specifications = await vitest.globTestSpecifications();
    const modules = await vitest.parseSpecifications(specifications);
    return modules.flatMap((module) => [...module.children.allTests()].map((test) => test.fullName));
  } finally {
    await vitest.close();
  }
}
