import { NextResponse } from 'next/server'
import crypto from 'crypto'

function makeCoolSmsAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(8).toString('hex')
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, Salt=${salt}, Signature=${signature}`
}

export async function GET() {
  const apiKey = process.env.COOLSMS_API_KEY
  const apiSecret = process.env.COOLSMS_API_SECRET
  const sender = process.env.COOLSMS_SENDER_PHONE

  // 환경변수 확인
  const envCheck = {
    COOLSMS_API_KEY: apiKey ? `설정됨 (앞4자: ${apiKey.slice(0, 4)}..., 길이: ${apiKey.length})` : '❌ 미설정',
    COOLSMS_API_SECRET: apiSecret ? `설정됨 (길이: ${apiSecret.length})` : '❌ 미설정',
    COOLSMS_SENDER_PHONE: sender ?? '❌ 미설정',
  }

  if (!apiKey || !apiSecret || !sender) {
    return NextResponse.json({ ok: false, step: 'env_missing', envCheck })
  }

  // CoolSMS 잔액 조회
  let balanceResult: unknown = null
  try {
    const balRes = await fetch('https://api.coolsms.co.kr/cash/v1/balance', {
      method: 'GET',
      headers: { Authorization: makeCoolSmsAuthHeader(apiKey, apiSecret) },
    })
    const balText = await balRes.text()
    try { balanceResult = JSON.parse(balText) } catch { balanceResult = balText }
  } catch (e) {
    balanceResult = { error: String(e) }
  }

  // CoolSMS 실제 발송 테스트 (발신번호 자기 자신에게)
  let sendResult: unknown = null
  let sendStatus = 0
  try {
    const body = JSON.stringify({
      message: {
        to: sender,
        from: sender,
        text: '[나들목] SMS 테스트 메시지입니다.',
      },
    })
    const sendRes = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeCoolSmsAuthHeader(apiKey, apiSecret),
      },
      body,
    })
    sendStatus = sendRes.status
    const sendText = await sendRes.text()
    try { sendResult = JSON.parse(sendText) } catch { sendResult = sendText }
  } catch (e) {
    sendResult = { error: String(e) }
  }

  return NextResponse.json({
    ok: true,
    envCheck,
    balanceResult,
    sendStatus,
    sendResult,
    timestamp: new Date().toISOString(),
  })
}
