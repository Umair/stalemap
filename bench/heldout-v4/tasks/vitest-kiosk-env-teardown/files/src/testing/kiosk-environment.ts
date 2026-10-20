import type { Environment } from "vitest/runtime";
import { populateGlobal } from "vitest/runtime";
import { createKioskWindow } from "../kiosk/window.ts";

/** Vitest environment that runs a test file inside the kiosk shell's window. */
const kioskEnvironment: Environment = {
  name: "kiosk",
  viteEnvironment: "client",
  setup(global) {
    const dom = createKioskWindow();
    const { keys, originals } = populateGlobal(global, dom.window, { bindFunctions: true });

    return {
      teardown(global) {
        // FIXME: the kiosk globals stay behind after a test file finishes.
        void keys;
        void originals;
        void global;
        dom.window.close();
      },
    };
  },
};

export default kioskEnvironment;
