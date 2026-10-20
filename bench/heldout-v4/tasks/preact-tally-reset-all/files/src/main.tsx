import { render } from "preact";
import { Dashboard } from "./Dashboard.tsx";

export function mount(container: Element) {
  render(<Dashboard />, container);
}
