import type { ReactNode } from "react";
import { SiteFooter } from "../components/SiteFooter";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "fr" }, { lang: "de" }];
}

export default async function RootLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <html lang={lang}>
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
