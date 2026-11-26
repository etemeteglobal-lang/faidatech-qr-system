import type { Metadata } from "next";
import ConsentBanner from "@/components/privacy/ConsentBanner";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaidATech — Dynamic QR Operations",
  description: "A tenant-aware platform for creating and resolving dynamic QR experiences.",
  icons: { icon: "/faidatech-mark.svg" },
  other: { "privacy-retention": "Optional analytics retention is user-selectable: 30, 90, or 365 days." },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body><LocaleProvider>{children}<ConsentBanner /></LocaleProvider></body>
    </html>
  );
}
