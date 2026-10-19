export const MAX_LABEL_LENGTH = 12;

export interface NavItem {
  label: string;
  href: string;
}

type Chars<S extends string> = S extends `${infer C}${infer Rest}` ? [C, ...Chars<Rest>] : [];
type UpTo12 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
type CheckedLabel<S extends string> = Chars<S>["length"] extends UpTo12 ? S : never;

export function navItem<const L extends string>(label: CheckedLabel<L>, href: string): NavItem {
  return { label: label as string, href };
}

export function isValidLabel(label: string): boolean {
  return Array.from(label).length <= MAX_LABEL_LENGTH;
}
