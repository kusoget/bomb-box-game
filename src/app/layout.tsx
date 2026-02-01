import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "💥 爆弾箱ゲーム - 1vs1心理戦バトル | KUSOGET",
  description: "12個の箱から爆弾を避けろ！1vs1のオンライン心理戦ゲーム。仕掛け役と開け役を交代しながら、相手の裏をかいて生き残れ。ブラウザで無料で遊べるデスゲーム。",
  keywords: ["爆弾箱ゲーム", "KUSOGET", "心理戦", "オンライン対戦", "ブラウザゲーム", "無料ゲーム"],
  openGraph: {
    title: "💥 爆弾箱ゲーム - 1vs1心理戦バトル",
    description: "その箱は安全か、爆発か？12個の箱を巡る命がけの心理戦。今すぐ対戦！",
    type: "website",
    locale: "ja_JP",
    siteName: "KUSOGET",
  },
  twitter: {
    card: "summary_large_image",
    title: "💥 爆弾箱ゲーム",
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
