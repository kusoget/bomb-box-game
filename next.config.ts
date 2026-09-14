import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workers の Static Assets へそのまま載せるので完全な静的書き出し。
  // API と WebSocket は worker/ 側（Durable Object）が担当する。
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
