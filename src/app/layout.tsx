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
  title: "ZENOVA — 商品から始めるAIショート動画スタジオ",
  description:
    "商品URLや画像から、ショート動画の企画・日本語台本・映像制作を進めるAIスタジオ。",
  openGraph: {
    title: "ZENOVA — 商品から始めるAIショート動画スタジオ",
    description: "商品URLや画像から、企画・日本語台本・映像制作へ。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZENOVA — 商品から始めるAIショート動画スタジオ",
    description: "商品URLや画像から、企画・日本語台本・映像制作へ。",
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
