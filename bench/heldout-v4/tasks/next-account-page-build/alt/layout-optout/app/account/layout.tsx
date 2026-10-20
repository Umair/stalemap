import type { ReactNode } from "react";

// Everything under /account renders per request and may hold the response until it's ready.
export const instant = false;

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <section className="account">{children}</section>;
}
