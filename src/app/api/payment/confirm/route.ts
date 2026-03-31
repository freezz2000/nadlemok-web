import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { ServicePlan } from '@/lib/types'

const PLAN_CONFIG: Record<ServicePlan, { panel: number; duration: number }> = {
  basic:    { panel: 50,  duration: 10 },
  standard: { panel: 50,  duration: 10 },
  premium:  { panel: 100, duration: 15 },
}

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount, formData } = await req.json() as {
      paymentKey: string
      orderId: string
      amount: number
      formData: {
        product_name: string
        product_category: string
        plan: ServicePlan
        notes?: string
        user_id: string
      }
    }

    // ── 1. 토스페이먼츠 서버 승인 ─────────────────────────────
    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey || secretKey === 'test_sk_placeholder') {
      return NextResponse.json({ error: 'TOSS_SECRET_KEY가 설정되지 않았습니다.' }, { status: 500 })
    }

    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(secretKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const tossData = await tossRes.json()
    if (!tossRes.ok) {
      console.error('Toss confirm error:', tossData)
      return NextResponse.json({ error: tossData.message ?? '결제 승인 실패' }, { status: tossRes.status })
    }

    // ── 2. Supabase에 프로젝트 + 결제 내역 저장 ──────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const planCfg = PLAN_CONFIG[formData.plan]

    // 프로젝트 생성
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        client_id: formData.user_id,
        product_name: formData.product_name,
        product_category: formData.product_category,
        plan: formData.plan,
        panel_size: planCfg.panel,
        test_duration: planCfg.duration,
        status: 'pending',
      })
      .select('id')
      .single()

    if (projectError) {
      console.error('Project insert error:', projectError)
      return NextResponse.json({ error: '프로젝트 생성 실패' }, { status: 500 })
    }

    // 결제 내역 저장
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: formData.user_id,
      project_id: project.id,
      order_id: orderId,
      payment_key: paymentKey,
      amount,
      plan: formData.plan,
      status: 'DONE',
      paid_at: tossData.approvedAt ?? new Date().toISOString(),
    })

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      // 결제는 완료됐으므로 에러 로깅만 (프로젝트는 이미 생성됨)
    }

    return NextResponse.json({ success: true, projectId: project.id })

  } catch (err) {
    console.error('Confirm API error:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
