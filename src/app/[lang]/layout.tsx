import type { Metadata } from "next";
import "../globals.css";
import { i18n } from "@/i18n-config";
import Providers from "@/components/providers";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export const metadata: Metadata = {
  title: {
    default: "Conflux Builder - Build Custom Conflux Binaries",
    template: "%s | Conflux Builder",
  },
  description:
    "Build your own custom Conflux binary with different OS, architecture, and dependency configurations. All builds include provenance attestation for transparency and verification.",
  keywords: [
    "Conflux",
    "blockchain",
    "binary builder",
    "custom build",
    "GitHub Actions",
    "provenance",
    "attestation",
    "Linux",
    "Windows",
    "macOS",
    "x86_64",
    "aarch64",
  ],
  publisher: "Conflux Builder",
  applicationName: "Conflux Builder",
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      zh: "/zh",
    },
  },
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
