import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 크레딧 패키지 정의
const CREDIT_PACKAGES: Record<number, { price: number }> = {
  30: { price: 500000 },
  50: { price: 800000 },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { paymentKey, orderId, amount, credits, deliveryFee, projectId } = await req.json() as {
      paymentKey: string
      orderId: string
      amount: number
      credits: number
      deliveryFee?: number
      projectId?: string
    }

    if (!paymentKey || !orderId || !amount || !credits) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 크레딧·금액 유효성 검증 (배송 대행료 포함 합산)
    const pkg = CREDIT_PACKAGES[credits]
    const expectedAmount = (pkg?.price ?? 0) + (deliveryFee ?? 0)
    if (!pkg || expectedAmount !== amount) {
      return NextResponse.json({ error: '유효하지 않은 결제 금액입니다.' }, { status: 400 })
    }

    // 중복 결제 방지
    const { data: existing } = await admin
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .single()
    if (existing) {
      return NextResponse.json({ success: true, message: '이미 처리된 결제입니다.' })
    }

    // TossPayments 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY!
    const encoded = Buffer.from(secretKey + ':').toString('base64')

    const confirmRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: { Authorization: `Basic ${encoded}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const confirmData = await confirmRes.json()

    if (confirmData.status !== 'DONE') {
      return NextResponse.json({ error: '결제 승인 실패', detail: confirmData }, { status: 400 })
    }

    // 결제 이력 저장 (plan 제약: 'credit' 사용, payment_context: 'credit_charge')
    const { error: paymentErr } = await admin.from('payments').insert({
      user_id: user.id,
      order_id: orderId,
      payment_key: paymentKey,
      amount,
      plan: 'credit',
      status: 'DONE',
      paid_at: confirmData.approvedAt,
      payment_context: 'credit_charge',
    })
    if (paymentErr) {
      // 결제 기록 실패는 로그만 남기고 계속 진행 (크레딧은 충전)
      console.error('[credit-confirm] payments insert error:', paymentErr.message, paymentErr.code)
    }

    // 크레딧 충전 — upsert로 행 없어도 자동 생성
    const { data: cr, error: crSelectErr } = await admin
      .from('client_credits')
      .select('balance')
      .eq('client_id', user.id)
      .single()

    if (crSelectErr && crSelectErr.code !== 'PGRST116') {
      // PGRST116 = row not found (정상 케이스), 그 외는 진짜 에러
      console.error('[credit-confirm] client_credits select error:', crSelectErr.message)
      return NextResponse.json({ error: `크레딧 DB 오류: ${crSelectErr.message}` }, { status: 500 })
    }

    const newBalance = (cr?.balance ?? 0) + credits

    const { error: upsertErr } = await admin
      .from('client_credits')
      .upsert(
        { client_id: user.id, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' }
      )

    if (upsertErr) {
      console.error('[credit-confirm] client_credits upsert error:', upsertErr.message)
      return NextResponse.json({ error: `크레딧 업데이트 실패: ${upsertErr.message}` }, { status: 500 })
    }

    // 거래 이력
    const { error: txErr } = await admin.from('credit_transactions').insert({
      client_id: user.id,
      amount: credits,
      transaction_type: 'subscription',
      note: deliveryFee && deliveryFee > 0
        ? `크레딧 ${credits}개 + 배송 대행료 ${deliveryFee.toLocaleString()}원 합산 결제`
        : `크레딧 ${credits}개 충전 (${amount.toLocaleString()}원 결제)`,
    })
    if (txErr) {
      console.error('[credit-confirm] credit_transactions insert error:', txErr.message)
    }

    // 배송 대행료 선결제 처리 — 프로젝트 delivery_service_paid 플래그 설정
    if (deliveryFee && deliveryFee > 0 && projectId) {
      try {
        await admin
          .from('projects')
          .update({ delivery_service_paid: true })
          .eq('id', projectId)
          .eq('client_id', user.id)
      } catch (e) {
        // 컬럼 미존재 시 무시 (Supabase migration 실행 전)
        console.warn('[credit-confirm] delivery_service_paid update skipped:', e)
      }
    }

    return NextResponse.json({ success: true, credits, remaining: newBalance })
  } catch (err) {
    console.error('credit-confirm error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
