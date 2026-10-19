import { createLucideIcon, type LucideIcon, type LucideIconData } from "lucide-react";
import { parseSvgShapes } from "./svg.ts";

/** A lucide icon component for an SVG icon a user uploaded for one of their custom categories. */
export function iconFromSvg(name: string, svg: string): LucideIcon {
  const icon: LucideIconData = { name, size: 24, node: [] };
  for (const shape of parseSvgShapes(svg)) icon.node.push([shape.tag, shape.attributes]);
  return createLucideIcon(icon);
}
