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

// A prefixItems tuple without `items: false` is open-ended in JSON Schema, so the converted schema accepts extra
// elements; pin both pairs to two entries here.
const WidgetSchema = z
  .fromJSONSchema(widgetJsonSchema)
  .refine((w: any) => w.position.length === 2 && w.size.length === 2, { message: "position and size are pairs" });

/** Validates one widget from a saved dashboard; throws if it isn't valid. */
export function parseWidget(input: unknown): Widget {
  return WidgetSchema.parse(input) as Widget;
}
