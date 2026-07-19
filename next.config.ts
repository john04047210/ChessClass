import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.128.136"],
  output: "export",
  trailingSlash: true,
};

export default nextConfig;
