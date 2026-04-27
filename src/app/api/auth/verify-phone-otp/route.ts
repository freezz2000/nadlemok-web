import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()

    const cleanPhone = String(phone ?? '').replace(/[^0-9]/g, '')
    const cleanOtp = String(otp ?? '').trim()

    if (!cleanPhone || !cleanOtp) {
      return NextResponse.json({ error: '필수 값이 누락되었습니다.' }, { status: 400 })
    }

    // 가장 최근 OTP 조회
    const { data: record } = await supabase
      .from('phone_verifications')
      .select('id, otp, expires_at, verified')
      .eq('phone', cleanPhone)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!record) {
      return NextResponse.json({ error: '인증번호를 먼저 요청해주세요.' }, { status: 400 })
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: '인증번호가 만료되었습니다. 다시 요청해주세요.' }, { status: 400 })
    }

    if (record.otp !== cleanOtp) {
      return NextResponse.json({ error: '인증번호가 일치하지 않습니다.' }, { status: 400 })
    }

    // 인증 완료 표시
    await supabase
      .from('phone_verifications')
      .update({ verified: true })
      .eq('id', record.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[verify-phone-otp] error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
