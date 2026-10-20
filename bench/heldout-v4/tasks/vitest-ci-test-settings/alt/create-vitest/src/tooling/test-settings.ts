import { createVitest } from "vitest/node";

export interface TestSettings {
  environment: string;
  testTimeout: number;
  include: string[];
}

/** The test settings our CI dashboard shows for the project at `root`. */
export async function getTestSettings(root: string): Promise<TestSettings> {
  const vitest = await createVitest("test", { root, watch: false });
  try {
    return { environment: vitest.config.environment, testTimeout: vitest.config.testTimeout, include: [...vitest.config.include] };
  } finally {
    await vitest.close();
  }
}
