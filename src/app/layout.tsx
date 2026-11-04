import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZENOVA — Short Drama Studio",
  description:
    "ショートドラマの脚本、シーン設計、音声、字幕、縦型動画制作をまとめるスタジオ。",
  openGraph: {
    title: "ZENOVA — Short Drama Studio",
    description:
      "ショートドラマの脚本から縦型動画までを制作。",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZENOVA — Short Drama Studio",
    description:
      "画像でも、言葉でも。アイデアをそのまま映像へ。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
