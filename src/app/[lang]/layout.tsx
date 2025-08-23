import type { Metadata } from "next";
import "../globals.css";
import { i18n } from "@/i18n-config";
import Providers from "@/components/providers";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export const metadata: Metadata = {
  title: "Conflux Builder",
  description: "Build your own Conflux binary",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return (
    <html lang={lang}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
