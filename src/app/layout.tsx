import type { Metadata } from "next";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaidATech — Dynamic QR Operations",
  description: "A tenant-aware platform for creating and resolving dynamic QR experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr">
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
