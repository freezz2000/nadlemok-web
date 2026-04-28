import { NextResponse } from 'next/server'

// 임시 진단 엔드포인트 — 실제 Aligo SMS API 응답 확인용
// 사용 후 삭제 예정
export async function GET() {
  const apikey = process.env.ALIGO_API_KEY
  const userid = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER_PHONE ?? process.env.ALIGO_SENDER

  // 환경변수 상태만 먼저 확인
  const envStatus = {
    ALIGO_API_KEY: apikey ? `설정됨 (앞3자: ${apikey.slice(0, 3)}...)` : '❌ 미설정',
    ALIGO_USER_ID: userid ? `설정됨 (값: ${userid})` : '❌ 미설정',
    ALIGO_SENDER_PHONE: process.env.ALIGO_SENDER_PHONE
      ? `설정됨 (값: ${process.env.ALIGO_SENDER_PHONE})`
      : '❌ 미설정',
    ALIGO_SENDER: process.env.ALIGO_SENDER
      ? `설정됨 (값: ${process.env.ALIGO_SENDER})`
      : '미설정',
    sender_used: sender ?? '❌ undefined',
  }

  if (!apikey || !userid || !sender) {
    return NextResponse.json({ ok: false, step: 'env_check', envStatus })
  }

  // Aligo 잔액 조회 (remain API — SMS 차감 없음)
  try {
    const remainParams = new URLSearchParams({ key: apikey, user_id: userid })
    const remainRes = await fetch('https://apis.aligo.in/remain/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: remainParams.toString(),
    })
    const remainText = await remainRes.text()
    let remainData: unknown
    try { remainData = JSON.parse(remainText) } catch { remainData = remainText }

    return NextResponse.json({
      ok: true,
      step: 'remain_check',
      envStatus,
      aligoRemain: remainData,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, step: 'remain_fetch_error', error: String(e), envStatus })
  }
}
