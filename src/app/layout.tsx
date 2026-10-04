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
  title: "ZENOVA — AI Create Studio | Video & Motion",
  description:
    "画像・プロンプトからAI動画を制作。生成・レビュー・改善をひとつのワークスペースにまとめるクリエイター向けCreate Studio。",
  openGraph: {
    title: "ZENOVA — AI Create Studio | Video & Motion",
    description:
      "画像・プロンプトからAI動画を制作。生成・レビュー・改善をひとつのワークスペースに。",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZENOVA — AI Video Studio",
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
