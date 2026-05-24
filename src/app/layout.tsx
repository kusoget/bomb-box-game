import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource/line-seed-jp/japanese-400.css";
import "@fontsource/line-seed-jp/japanese-700.css";
import "@fontsource/line-seed-jp/japanese-800.css";
import "@fontsource/line-seed-jp/400.css";
import "@fontsource/line-seed-jp/700.css";
import "@fontsource/line-seed-jp/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "💥 BOXBOM - 1vs1心理戦バトル",
  description: "12個の箱から爆弾を避けろ！1vs1のオンライン心理戦ゲーム BOXBOM。仕掛け役と開け役を交代しながら、相手の裏をかいて生き残れ。",
  keywords: ["BOXBOM", "ボックスボム", "心理戦", "オンライン対戦", "ブラウザゲーム", "無料ゲーム"],
  openGraph: {
    title: "💥 BOXBOM - 1vs1心理戦バトル",
    description: "その箱は安全か、爆発か？12個の箱を巡る命がけの心理戦。今すぐ対戦！",
    type: "website",
    locale: "ja_JP",
    siteName: "BOXBOM",
  },
  twitter: {
    card: "summary_large_image",
    title: "💥 BOXBOM",
    description: "その箱は安全か、爆発か？12個の箱を巡る命がけの心理戦。",
  },
  other: {
    "google-adsense-account": "ca-pub-7579337045676242",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7579337045676242"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
