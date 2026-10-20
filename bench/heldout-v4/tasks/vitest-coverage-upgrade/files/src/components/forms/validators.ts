export const required = (value: string): string | undefined => (value.trim() ? undefined : "Required");
