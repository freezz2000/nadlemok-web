import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 결제금액 → 크레딧 역산
const AMOUNT_TO_CREDITS: Record<number, number> = {
  500000: 30,
  800000: 50,
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. 인증 확인 ──────────────────────────────────────────
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    // ── 2. 요청 파싱 ─────────────────────────────────────────
    const { paymentId } = await req.json() as { paymentId: string }
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId가 필요합니다.' }, { status: 400 })
    }

    // ── 3. 결제 조회 — 반드시 본인 결제여야 함 ────────────────
    const { data: payment, error: paymentErr } = await admin
      .from('payments')
      .select('id, payment_key, amount, status, user_id, order_id, paid_at')
      .eq('id', paymentId)
      .eq('user_id', user.id)          // 본인 결제만
      .eq('payment_context', 'credit_charge')
      .single()

    if (paymentErr || !payment) {
      return NextResponse.json({ error: '결제 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (payment.status !== 'DONE') {
      return NextResponse.json(
        { error: '이미 처리된 결제입니다.' },
        { status: 409 }
      )
    }

    if (!payment.payment_key) {
      return NextResponse.json({ error: '결제 정보가 올바르지 않습니다.' }, { status: 400 })
    }

    // ── 4. 크레딧 수 역산 ────────────────────────────────────
    const credits = AMOUNT_TO_CREDITS[payment.amount]
    if (!credits) {
      return NextResponse.json({ error: '알 수 없는 결제 금액입니다.' }, { status: 400 })
    }

    // ── 5. 크레딧 잔액 확인 ───────────────────────────────────
    const { data: creditRow } = await admin
      .from('client_credits')
      .select('balance')
      .eq('client_id', user.id)
      .single()

    const currentBalance = creditRow?.balance ?? 0

    if (currentBalance < credits) {
      return NextResponse.json(
        {
          error: `크레딧이 이미 사용되어 환불이 불가능합니다. (현재 잔액: ${currentBalance}cr / 환불 필요: ${credits}cr)`,
          currentBalance,
          requiredCredits: credits,
        },
        { status: 422 }
      )
    }

    // ── 6. TossPayments 결제 취소 ────────────────────────────
    const secretKey = process.env.TOSS_SECRET_KEY!
    const encoded = Buffer.from(secretKey + ':').toString('base64')

    const cancelRes = await fetch(
      `https://api.tosspayments.com/v1/payments/${payment.payment_key}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: '고객 환불 요청',
          cancelAmount: payment.amount,
        }),
      }
    )

    const cancelData = await cancelRes.json()

    if (!cancelRes.ok) {
      console.error('[client-refund] TossPayments cancel failed:', cancelData)
      return NextResponse.json(
        { error: `환불 처리 실패: ${cancelData.message || cancelData.code || '다시 시도해주세요.'}` },
        { status: 500 }
      )
    }

    // ── 7. payments 상태 업데이트 ─────────────────────────────
    await admin
      .from('payments')
      .update({ status: 'CANCELED' })
      .eq('id', paymentId)

    // ── 8. 크레딧 차감 ───────────────────────────────────────
    const newBalance = currentBalance - credits
    await admin
      .from('client_credits')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('client_id', user.id)

    // ── 9. 거래 이력 기록 ─────────────────────────────────────
    await admin.from('credit_transactions').insert({
      client_id: user.id,
      amount: -credits,
      transaction_type: 'consume',
      note: `환불 — ${credits}cr 차감 (${payment.amount.toLocaleString()}원 취소)`,
    })

    return NextResponse.json({
      ok: true,
      refundedCredits: credits,
      refundedAmount: payment.amount,
      newBalance,
    })
  } catch (err) {
    console.error('[client-refund] error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
