import { useLayoutEffect, useState } from "preact/hooks";
import { bindKey } from "./keyboard.ts";

const SHORTCUTS: [string, string][] = [
  ["?", "Show or hide this list"],
  ["/", "Search the docs"],
  ["g h", "Go to the home page"],
];

/** The floating "Keyboard shortcuts" helper we embed on partner pages. */
export function HelpWidget() {
  const [open, setOpen] = useState(false);

  // A layout effect, so the key is released synchronously when the widget unmounts.
  useLayoutEffect(() => {
    const unbind = bindKey("?", () => setOpen((o) => !o));
    return unbind;
  }, []);

  return (
    <div class="help-widget">
      <button type="button" onClick={() => setOpen((o) => !o)}>
        Keyboard shortcuts
      </button>
      {open && (
        <aside class="help-panel">
          <ul>
            {SHORTCUTS.map(([keys, what]) => (
              <li key={keys}>
                <kbd>{keys}</kbd> {what}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
