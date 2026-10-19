import type { ReactNode } from "react";
import "./globals.css";
import "../styles/scroll.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
