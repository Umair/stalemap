import { createElement, forwardRef, type ComponentProps } from "react";
import { Icon, type LucideIcon } from "lucide-react";
import { parseSvgShapes } from "./svg.ts";

type Shapes = ComponentProps<typeof Icon>["iconNode"];

/** A lucide icon component for an SVG icon a user uploaded for one of their custom categories. */
export function iconFromSvg(name: string, svg: string): LucideIcon {
  const iconNode: Shapes = parseSvgShapes(svg).map(({ tag, attributes }, i) => [tag, { ...attributes, key: String(i) }]);
  const Uploaded: LucideIcon = forwardRef<SVGSVGElement, ComponentProps<LucideIcon>>(({ className, ...props }, ref) =>
    createElement(Icon, { ...props, ref, iconNode, className: [`lucide-${name}`, className].filter(Boolean).join(" ") }),
  );
  Uploaded.displayName = name;
  return Uploaded;
}
