import { NextResponse } from 'next/server'

// 임시 진단용 엔드포인트 — 배포 후 제거
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    exists: !!key,
    length: key?.length ?? 0,
    prefix: key ? key.slice(0, 14) + '...' : '(none)',
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL_exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  })
}
