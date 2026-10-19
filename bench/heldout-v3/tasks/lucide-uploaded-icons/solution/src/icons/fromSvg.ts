import { createLucideIcon, type LucideIcon, type LucideIconNode } from "lucide-react";
import { parseSvgShapes } from "./svg.ts";

/** A lucide icon component for an SVG icon a user uploaded for one of their custom categories. */
export function iconFromSvg(name: string, svg: string): LucideIcon {
  const node: LucideIconNode[] = parseSvgShapes(svg).map(({ tag, attributes }, i) => [tag, { ...attributes, key: `${tag}-${i}` }]);
  return createLucideIcon(name, node);
}
