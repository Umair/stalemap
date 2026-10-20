import { resolveConfig } from "vitest/node";

export interface TestSettings {
  environment: string;
  testTimeout: number;
  include: string[];
}

/** The test settings our CI dashboard shows for the project at `root`. */
export async function getTestSettings(root: string): Promise<TestSettings> {
  const viteConfig = await resolveConfig({ root });
  const { environment, testTimeout, include } = viteConfig.test;
  return { environment, testTimeout, include };
}
