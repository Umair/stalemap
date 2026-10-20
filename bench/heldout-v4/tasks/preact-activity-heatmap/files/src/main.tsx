import { render } from "preact/compat";
import { ActivityHeatmap, type Day } from "./ActivityHeatmap.tsx";

export function mountHeatmap(container: Element, days: Day[]) {
  render(<ActivityHeatmap days={days} />, container);
}
