import { NextResponse } from 'next/server'

// 임시 진단 엔드포인트 — 사용 후 삭제 예정
export async function GET() {
  // Vercel이 자동 주입하는 프로젝트/배포 메타정보
  const vercelMeta = {
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '미설정',
    VERCEL_URL: process.env.VERCEL_URL ?? '미설정',
    VERCEL_ENV: process.env.VERCEL_ENV ?? '미설정',
    VERCEL_REGION: process.env.VERCEL_REGION ?? '미설정',
    NODE_ENV: process.env.NODE_ENV ?? '미설정',
  }

  // process.env에서 ALIGO 관련 키 전부 수집
  const aligoKeys = Object.keys(process.env)
    .filter((k) => k.toUpperCase().includes('ALIGO'))
    .reduce<Record<string, string>>((acc, k) => {
      const v = process.env[k] ?? ''
      acc[k] = v ? `설정됨 (앞5자: ${v.slice(0, 5)}..., 길이: ${v.length})` : '❌ 빈값'
      return acc
    }, {})

  // 전체 env 키 수 (디버깅용)
  const totalEnvKeys = Object.keys(process.env).length

  const apikey = process.env.ALIGO_API_KEY
  const userid = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER_PHONE ?? process.env.ALIGO_SENDER

  const envStatus = {
    ALIGO_API_KEY: apikey ? `설정됨 (앞5자: ${apikey.slice(0, 5)}..., 길이: ${apikey.length})` : '❌ 미설정',
    ALIGO_USER_ID: userid ? `설정됨 (값: ${userid})` : '❌ 미설정',
    ALIGO_SENDER_PHONE: process.env.ALIGO_SENDER_PHONE
      ? `설정됨 (값: ${process.env.ALIGO_SENDER_PHONE})`
      : '❌ 미설정',
    ALIGO_SENDER: process.env.ALIGO_SENDER ?? '미설정',
    sender_used: sender ?? '❌ undefined',
  }

  return NextResponse.json({
    ok: !!(apikey && userid && sender),
    envStatus,
    allAligoKeys: aligoKeys,
    totalEnvKeys,
    vercelMeta,
    timestamp: new Date().toISOString(),
  })
}
