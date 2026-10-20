import { resolveConfig } from "vitest/node";

export interface TestSettings {
  environment: string;
  testTimeout: number;
  include: string[];
}

/** The test settings our CI dashboard shows for the project at `root`. */
export async function getTestSettings(root: string): Promise<TestSettings> {
  const { vitestConfig } = await resolveConfig({ root });
  const { environment, testTimeout, include } = vitestConfig;
  return { environment, testTimeout, include };
}
