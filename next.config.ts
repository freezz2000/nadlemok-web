import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
  // ANTHROPIC_API_KEY는 서버 전용 → .env.local(로컬) / Vercel 환경변수(배포) 에서 직접 읽음
  // next.config.ts env 섹션에 넣으면 빌드 타임 정적 값이 런타임 process.env를 덮어쓸 수 있음
};

export default nextConfig;
