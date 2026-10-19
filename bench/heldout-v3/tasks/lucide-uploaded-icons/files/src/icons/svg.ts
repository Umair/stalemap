/** One drawing element of an SVG: its tag and its attributes (camelCased for React). */
export interface SvgShape {
  tag: string;
  attributes: Record<string, string>;
}

const SHAPE_TAGS = new Set(["path", "circle", "ellipse", "line", "polyline", "polygon", "rect"]);
const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** The drawing elements of an uploaded SVG, in order. Scripts, styles and event handlers are dropped. */
export function parseSvgShapes(svg: string): SvgShape[] {
  const shapes: SvgShape[] = [];
  for (const [, tag, rest] of svg.matchAll(/<([a-zA-Z]+)\b([^>]*)>/g)) {
    if (!SHAPE_TAGS.has(tag)) continue;
    const attributes: Record<string, string> = {};
    for (const [, name, , value] of rest.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(["'])(.*?)\2/g)) {
      if (/^on/i.test(name) || name === "style") continue;
      attributes[camel(name)] = value;
    }
    shapes.push({ tag, attributes });
  }
  return shapes;
}
