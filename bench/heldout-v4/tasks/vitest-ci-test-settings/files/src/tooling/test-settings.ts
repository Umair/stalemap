export interface TestSettings {
  environment: string;
  testTimeout: number;
  include: string[];
}

/** The test settings our CI dashboard shows for the project at `root`. */
export async function getTestSettings(root: string): Promise<TestSettings> {
  throw new Error(`not implemented: ${root}`);
}
