export const MAX_LABEL_LENGTH = 12;

export interface NavItem {
  label: string;
  href: string;
}

/** What is left of S after its first MAX_LABEL_LENGTH characters ("" when it fits). */
type Overflow<S extends string, Seen extends unknown[] = []> = Seen["length"] extends typeof MAX_LABEL_LENGTH
  ? S
  : S extends `${infer _}${infer Rest}`
    ? Overflow<Rest, [...Seen, unknown]>
    : "";

export type ValidLabel<S extends string> = Overflow<S> extends "" ? S : never;

/** A tab in the nav bar, declared in code. */
export function navItem<L extends string>(label: ValidLabel<L>, href: string): NavItem {
  return { label, href };
}

/** Checks a tab label that comes from the CMS. */
export function isValidLabel(label: string): boolean {
  // Template literal inference takes one Unicode code point per step, so count code points here too.
  return [...label].length <= MAX_LABEL_LENGTH;
}
