import { render } from "preact";
import { HelpWidget } from "./HelpWidget.tsx";

/** Called by partner pages. Returns a function that removes the widget again. */
export function mountHelpWidget(container: Element): () => void {
  render(<HelpWidget />, container);
  return () => render(null, container);
}
