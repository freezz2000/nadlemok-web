import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
  env: {
    // next.config.ts는 Vercel 빌드 타임에 평가됨 → 환경변수 값이 서버 번들에 주입됨
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  },
};

export default nextConfig;
