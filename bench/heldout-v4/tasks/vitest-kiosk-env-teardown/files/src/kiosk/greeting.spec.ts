import { expect, test } from "vitest";
import { renderGreeting } from "./greeting.ts";

test("renders into the kiosk app root", () => {
  renderGreeting("Ada");
  expect(document.querySelector("#app h1")?.textContent).toBe("Welcome, Ada");
  expect(kioskShell.version).toBe("3.2");
});
