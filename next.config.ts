import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;
