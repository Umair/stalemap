import type { Environment } from "vitest/runtime";
import { populateGlobal } from "vitest/runtime";
import { createKioskWindow } from "../kiosk/window.ts";

/** Vitest environment that runs a test file inside the kiosk shell's window. */
const kioskEnvironment: Environment = {
  name: "kiosk",
  viteEnvironment: "client",
  setup(global) {
    const dom = createKioskWindow();
    // Remember every global property exactly as it was, getters included.
    const before = Object.getOwnPropertyDescriptors(global);
    const { keys } = populateGlobal(global, dom.window, { bindFunctions: true });

    return {
      teardown(global) {
        dom.window.close();
        for (const key of keys) {
          const previous = before[key];
          if (previous) Object.defineProperty(global, key, previous);
          else delete global[key];
        }
      },
    };
  },
};

export default kioskEnvironment;
