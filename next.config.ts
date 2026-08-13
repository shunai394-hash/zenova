import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static をバンドルせず node_modules から読む（\ROOT\ プレースホルダ回避）
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/**": ["./node_modules/ffmpeg-static/**"],
  },
  experimental: {
    proxyClientMaxBodySize: "64mb",
  },
};

export default nextConfig;
