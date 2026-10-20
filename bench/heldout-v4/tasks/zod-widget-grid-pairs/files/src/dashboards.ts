import { parseWidget, type Widget } from "./widgets.ts";

export interface Dashboard {
  name: string;
  widgets: Widget[];
}

/** Loads a dashboard saved by the frontend (JSON text). */
export function loadDashboard(json: string): Dashboard {
  const raw = JSON.parse(json) as { name?: unknown; widgets?: unknown };
  if (typeof raw.name !== "string" || !Array.isArray(raw.widgets)) throw new Error("not a dashboard");
  return { name: raw.name, widgets: raw.widgets.map(parseWidget) };
}
