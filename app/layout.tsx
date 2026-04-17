import type { ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Serif_4, Space_Grotesk } from "next/font/google";

import "./globals.css";

const fontSans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ops.rumahjengkar.com"),
  title: {
    default: "JENGKAR KPI",
    template: "%s | JENGKAR KPI",
  },
  description:
    "Sistem absensi, progres kerja, KPI bulanan-tahunan, dan bonus tahunan untuk tim Rumah Jengkar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
      lang="id"
    >
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
