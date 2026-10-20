import { describe, test } from "vitest";
import { connectToStagingDatabase } from "./staging.ts";

await connectToStagingDatabase();

describe("checkout", () => {
  test("charges the saved card", () => {});
  test.todo("retries a declined card");
});
