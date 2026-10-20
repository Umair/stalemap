/**
 * Page-wide single-key shortcuts. Every part of the page (our widgets and the host page's own code) binds keys through
 * here so that two features can never silently fight over the same key.
 */
type Handler = (event: KeyboardEvent) => void;

const bindings = new Map<string, Handler>();
let listening = false;

function onKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
  bindings.get(event.key)?.(event);
}

/** Binds `key` (a KeyboardEvent.key value such as "?" or "/"). Throws if something else already holds it. Returns the unbind function. */
export function bindKey(key: string, handler: Handler): () => void {
  if (bindings.has(key)) throw new Error(`The ${JSON.stringify(key)} shortcut is already bound`);
  if (!listening) {
    document.addEventListener("keydown", onKeyDown);
    listening = true;
  }
  bindings.set(key, handler);
  return () => {
    if (bindings.get(key) === handler) bindings.delete(key);
  };
}

export function isBound(key: string): boolean {
  return bindings.has(key);
}
