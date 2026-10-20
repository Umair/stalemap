import { JSDOM } from "jsdom";

export const KIOSK_URL = "https://kiosk.local/checkout";

/** The browser window the kiosk shell gives our app: a fixed URL plus the shell's bridge object. */
export function createKioskWindow(): JSDOM {
  const dom = new JSDOM("<!doctype html><html><body><main id=app></main></body></html>", {
    url: KIOSK_URL,
    pretendToBeVisual: true,
  });
  Object.assign(dom.window, { kioskShell: { version: "3.2", printReceipt: (_text: string) => true } });
  return dom;
}
