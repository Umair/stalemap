import { expect, test } from "vitest";
import { add } from "./math.ts";

test("adds", () => expect(add(2, 3)).toBe(5));
