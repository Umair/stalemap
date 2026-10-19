import { dynamicIconImports, type IconName } from "lucide-react/dynamic.mjs";

/** One SVG element of an icon: its tag name (`path`, `circle`, ...) and its attributes. */
export type Shape = [tag: string, attributes: Record<string, string>];

export async function iconShapes(name: IconName): Promise<Shape[]> {
  throw new Error("not implemented");
}
