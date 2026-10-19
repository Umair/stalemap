import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ scrollBehavior: "smooth" }} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
