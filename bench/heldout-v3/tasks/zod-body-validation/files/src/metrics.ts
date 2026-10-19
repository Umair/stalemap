export const validationFailures = new Map<string, number>();

/** Count a rejected request body, by route and number of issues. */
export function recordValidationFailure(route: string, issueCount: number): void {
  validationFailures.set(route, (validationFailures.get(route) ?? 0) + issueCount);
}
