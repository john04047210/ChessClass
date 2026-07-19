import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.128.136"],
  output: "export",
  trailingSlash: true,
  basePath,
};

export default nextConfig;
