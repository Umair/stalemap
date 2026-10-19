import { dynamicIconImports, type IconName } from "lucide-react/dynamic.mjs";

/** One SVG element of an icon: its tag name (`path`, `circle`, ...) and its attributes. */
export type Shape = [tag: string, attributes: Record<string, string>];

export async function iconShapes(name: IconName): Promise<Shape[]> {
  const icon = await dynamicIconImports[name]();
  return icon.__iconData.node.map(([tag, { key, ...attributes }]) => [
    tag,
    Object.fromEntries(Object.entries(attributes).map(([k, v]) => [k, String(v)])),
  ]);
}
