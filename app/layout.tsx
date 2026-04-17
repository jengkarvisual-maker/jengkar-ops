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
  title: "Jengkar KPI",
  description:
    "Fondasi aplikasi operasional Rumah Jengkar untuk SOP, KPI, bonus tahunan, dan ritme review tim.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${fontSans.variable} ${fontSerif.variable} ${fontMono.variable}`}
      lang="id"
    >
      <body>{children}</body>
    </html>
  );
}
