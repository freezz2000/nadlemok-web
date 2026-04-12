import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_CONFIG = {
  starter: { credits: 100, amount: 29000 },
  growth:  { credits: 300, amount: 49000 },
} as const

type PlanKey = keyof typeof PLAN_CONFIG

// TossPayments 빌링키 발급 후 즉시 첫 결제 + 크레딧 충전
export async function POST(req: NextRequest) {
  try {
    const { authKey, customerKey, plan, clientId } = await req.json() as {
      authKey: string
      customerKey: string
      plan: PlanKey
      clientId: string
    }

    if (!authKey || !customerKey || !plan || !clientId) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const cfg = PLAN_CONFIG[plan]
    if (!cfg) return NextResponse.json({ error: '잘못된 플랜' }, { status: 400 })

    const secretKey = process.env.TOSS_SECRET_KEY!
    const encoded = Buffer.from(secretKey + ':').toString('base64')

    // 1. 빌링키 발급
    const billingRes = await fetch('https://api.tosspayments.com/v1/billing/authorizations/issue', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey, customerKey }),
    })
    const billingData = await billingRes.json()
    if (!billingData.billingKey) {
      return NextResponse.json({ error: '빌링키 발급 실패', detail: billingData }, { status: 400 })
    }

    // 2. 즉시 첫 결제 실행
    const orderId = `nadlemok-sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingData.billingKey}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey,
        amount: cfg.amount,
        orderId,
        orderName: `나들목 ${plan === 'starter' ? 'Starter' : 'Growth'} 구독 — ${cfg.credits}크레딧`,
        customerEmail: undefined,
      }),
    })
    const chargeData = await chargeRes.json()
    if (chargeData.status !== 'DONE') {
      return NextResponse.json({ error: '결제 실패', detail: chargeData }, { status: 400 })
    }

    // 3. 구독 정보 저장
    const now = new Date()
    const nextMonth = new Date(now)
    nextMonth.setMonth(nextMonth.getMonth() + 1)

    const { data: subscription } = await supabase
      .from('subscriptions')
      .insert({
        client_id: clientId,
        plan,
        billing_key: billingData.billingKey,
        customer_key: customerKey,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: nextMonth.toISOString(),
      })
      .select('id')
      .single()

    // 4. 결제 이력 저장
    await supabase.from('payments').insert({
      user_id: clientId,
      order_id: orderId,
      payment_key: chargeData.paymentKey,
      amount: cfg.amount,
      plan,
      status: 'DONE',
      paid_at: chargeData.approvedAt,
      payment_context: 'subscription',
    })

    // 5. 크레딧 충전
    const { data: existing } = await supabase
      .from('client_credits')
      .select('balance')
      .eq('client_id', clientId)
      .single()

    if (existing) {
      await supabase
        .from('client_credits')
        .update({ balance: existing.balance + cfg.credits, updated_at: new Date().toISOString() })
        .eq('client_id', clientId)
    } else {
      await supabase
        .from('client_credits')
        .insert({ client_id: clientId, balance: cfg.credits })
    }

    // 6. 크레딧 거래 이력
    await supabase.from('credit_transactions').insert({
      client_id: clientId,
      amount: cfg.credits,
      transaction_type: 'subscription',
      subscription_id: subscription?.id,
      note: `${plan} 구독 충전 (${cfg.credits}cr)`,
    })

    return NextResponse.json({ success: true, credits: cfg.credits })
  } catch (err) {
    console.error('billing/issue error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
