import type { IconName } from "lucide-react/dynamic.mjs";

/** One SVG element of an icon: its tag name (`path`, `circle`, ...) and its attributes. */
export type Shape = [tag: string, attributes: Record<string, string>];

type Node = [string, Record<string, unknown>, Node[]?];

export async function iconShapes(name: IconName): Promise<Shape[]> {
  const mod: { __iconData: { node: Node[] } } = await import(`lucide-react/dist/esm/icons/${name}.mjs`);
  const shapes: Shape[] = [];
  for (const [tag, attrs] of mod.__iconData.node) {
    const attributes: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) if (k !== "key") attributes[k] = String(v);
    shapes.push([tag, attributes]);
  }
  return shapes;
}
