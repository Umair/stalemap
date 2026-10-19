import { createLucideIcon, type IconNode, type LucideIcon } from "lucide-react";
import { parseSvgShapes } from "./svg.ts";

/** A lucide icon component for an SVG icon a user uploaded for one of their custom categories. */
export function iconFromSvg(name: string, svg: string): LucideIcon {
  const node = parseSvgShapes(svg).map(({ tag, attributes }, i) => [tag, { ...attributes, key: `${tag}-${i}` }]) as IconNode;
  return createLucideIcon(name, node);
}
