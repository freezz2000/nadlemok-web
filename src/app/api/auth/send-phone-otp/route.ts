import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── CoolSMS(솔라피) SMS 발송 ──────────────────────────────────────────────────
function makeCoolSmsAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString()
  const salt = crypto.randomBytes(8).toString('hex')
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex')
  return `HMAC-SHA256 ApiKey=${apiKey}, Date=${date}, Salt=${salt}, Signature=${signature}`
}

async function sendCoolSms(phone: string, message: string) {
  const apiKey = process.env.COOLSMS_API_KEY
  const apiSecret = process.env.COOLSMS_API_SECRET
  const sender = process.env.COOLSMS_SENDER_PHONE

  if (!apiKey || !apiSecret || !sender) {
    console.error('[send-phone-otp] CoolSMS 환경변수 미설정:', {
      COOLSMS_API_KEY: !!apiKey,
      COOLSMS_API_SECRET: !!apiSecret,
      COOLSMS_SENDER_PHONE: !!sender,
    })
    return { ok: false, message: 'CoolSMS 환경변수 미설정' }
  }

  try {
    const res = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: makeCoolSmsAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        messages: [
          {
            to: phone,
            from: sender,
            text: message,
          },
        ],
      }),
    })

    const text = await res.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, message: `응답 파싱 실패: ${text.slice(0, 200)}` }
    }

    console.log('[send-phone-otp] CoolSMS 응답:', JSON.stringify(data))

    if (res.ok) return { ok: true }
    return { ok: false, message: `[CoolSMS] ${JSON.stringify(data)}` }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}

// ── POST /api/auth/send-phone-otp ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    // 숫자만 추출
    const cleanPhone = String(phone ?? '').replace(/[^0-9]/g, '')
    if (!/^01[0-9]{8,9}$/.test(cleanPhone)) {
      return NextResponse.json({ error: '올바른 휴대폰 번호를 입력해주세요.' }, { status: 400 })
    }

    // 6자리 OTP 생성
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5분 후 만료

    // 기존 OTP 삭제 후 새로 삽입
    await supabase.from('phone_verifications').delete().eq('phone', cleanPhone)

    const { error: dbError } = await supabase.from('phone_verifications').insert({
      phone: cleanPhone,
      otp,
      expires_at: expiresAt,
    })

    if (dbError) {
      console.error('[send-phone-otp] DB insert error:', dbError)
      return NextResponse.json({ error: '인증번호 생성에 실패했습니다.' }, { status: 500 })
    }

    // CoolSMS 발송
    const smsResult = await sendCoolSms(cleanPhone, `[나들목] 인증번호: ${otp} (5분 이내 입력)`)

    if (!smsResult.ok) {
      console.error('[send-phone-otp] SMS 발송 실패:', smsResult.message)
      await supabase.from('phone_verifications').delete().eq('phone', cleanPhone)
      return NextResponse.json({ error: 'SMS 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[send-phone-otp] error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
