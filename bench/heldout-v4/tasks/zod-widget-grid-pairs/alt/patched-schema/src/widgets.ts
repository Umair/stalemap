import { readFileSync } from "node:fs";
import { z } from "zod";

/** The widget schema the dashboard frontend also validates against. Keep it the single source of truth. */
export const widgetJsonSchema = JSON.parse(readFileSync(new URL("../schemas/widget.schema.json", import.meta.url), "utf8"));

export interface Widget {
  id: string;
  kind: "chart" | "table" | "note";
  title?: string;
  position: [number, number];
  size: [number, number];
}

// Close the two pairs before converting: without a limit a prefixItems tuple accepts extra elements.
const closedSchema = structuredClone(widgetJsonSchema);
for (const key of ["position", "size"]) closedSchema.properties[key].maxItems = 2;
const WidgetSchema = z.fromJSONSchema(closedSchema);

/** Validates one widget from a saved dashboard; throws if it isn't valid. */
export function parseWidget(input: unknown): Widget {
  return WidgetSchema.parse(input) as Widget;
}
