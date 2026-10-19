export const MAX_LABEL_LENGTH = 12;

export interface NavItem {
  label: string;
  href: string;
}

/** A tab in the nav bar, declared in code. */
export function navItem(label: string, href: string): NavItem {
  return { label, href };
}

/** Checks a tab label that comes from the CMS. */
export function isValidLabel(label: string): boolean {
  throw new Error("not implemented");
}
