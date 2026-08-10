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
  title: "ZENOVA - 商品を貼るだけでTikTok動画をAIが作る",
  description:
    "商品URLか画像を貼るだけで、売れるTikTok動画をAIが自動生成。アフィリエイター・TikTok Shopセラー・個人店舗向けの日本語AI動画ツール。",
  openGraph: {
    title: "ZENOVA - 商品を貼るだけでTikTok動画をAIが作る",
    description:
      "商品URLか画像を貼るだけで、バズりやすいTikTok動画をAIが自動生成。",
    // ogImage: "/og-image.png", // アセット追加後に有効化
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
