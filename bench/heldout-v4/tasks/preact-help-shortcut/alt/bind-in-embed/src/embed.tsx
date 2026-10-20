import { render } from "preact";
import { HelpWidget } from "./HelpWidget.tsx";
import { bindKey } from "./keyboard.ts";

/** Called by partner pages. Returns a function that removes the widget again. */
export function mountHelpWidget(container: Element): () => void {
  let toggles = 0;
  const draw = () => render(<HelpWidget toggles={toggles} />, container);
  const unbind = bindKey("?", () => {
    toggles += 1;
    draw();
  });
  draw();
  return () => {
    unbind();
    render(null, container);
  };
}
