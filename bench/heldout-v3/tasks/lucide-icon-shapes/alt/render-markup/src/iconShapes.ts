import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dynamicIconImports, type IconName } from "lucide-react/dynamic.mjs";

/** One SVG element of an icon: its tag name (`path`, `circle`, ...) and its attributes. */
export type Shape = [tag: string, attributes: Record<string, string>];

const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

export async function iconShapes(name: IconName): Promise<Shape[]> {
  const { default: Icon } = await dynamicIconImports[name]();
  const markup = renderToStaticMarkup(createElement(Icon));
  const inner = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  const shapes: Shape[] = [];
  for (const [, tag, attrs] of inner.matchAll(/<([a-zA-Z]+)([^>]*?)\/?>/g)) {
    const attributes: Record<string, string> = {};
    for (const [, k, v] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) attributes[k] = decode(v);
    shapes.push([tag, attributes]);
  }
  return shapes;
}
