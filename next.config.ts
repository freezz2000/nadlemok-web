import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
};

export default nextConfig;
