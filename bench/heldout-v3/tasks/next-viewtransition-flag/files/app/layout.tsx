import { ViewTransition, type ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Cross-fade between pages. */}
        <ViewTransition>{children}</ViewTransition>
      </body>
    </html>
  );
}
