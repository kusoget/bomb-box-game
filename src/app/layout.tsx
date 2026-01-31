import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "⚡ Electric Chair - オンライン対戦ゲーム",
  description: "2人対戦の心理戦ゲーム。感電を避けながら高得点を目指せ！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
