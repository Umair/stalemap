export interface Toast {
  kind: "error" | "success";
  message: string;
}

/** Toasts shown so far (the UI renders the last few). */
export const toasts: Toast[] = [];

export const notify = {
  error(message: string): void {
    toasts.push({ kind: "error", message });
  },
  success(message: string): void {
    toasts.push({ kind: "success", message });
  },
};
