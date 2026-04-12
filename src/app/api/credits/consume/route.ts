import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_COST = { standard: 10, premium: 30 } as const
type AnalysisPlan = keyof typeof PLAN_COST

export async function POST(req: NextRequest) {
  try {
    const { clientId, projectId, plan } = await req.json() as {
      clientId: string
      projectId: string
      plan: AnalysisPlan
    }

    if (!clientId || !projectId || !plan) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const cost = PLAN_COST[plan]
    if (!cost) return NextResponse.json({ error: '잘못된 플랜' }, { status: 400 })

    // 이미 열람권 있는지 확인
    const { data: existing } = await supabase
      .from('analysis_access')
      .select('id')
      .eq('project_id', projectId)
      .eq('client_id', clientId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: '이미 열람 권한이 있습니다' })
    }

    // 크레딧 잔액 확인
    const { data: credits } = await supabase
      .from('client_credits')
      .select('balance')
      .eq('client_id', clientId)
      .single()

    if (!credits || credits.balance < cost) {
      return NextResponse.json({ error: '크레딧이 부족합니다', balance: credits?.balance ?? 0, required: cost }, { status: 402 })
    }

    // 크레딧 차감
    await supabase
      .from('client_credits')
      .update({ balance: credits.balance - cost, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)

    // 열람권 생성
    await supabase.from('analysis_access').insert({
      project_id: projectId,
      client_id: clientId,
      plan,
      credits_used: cost,
    })

    // 거래 이력
    await supabase.from('credit_transactions').insert({
      client_id: clientId,
      amount: -cost,
      transaction_type: 'consume',
      project_id: projectId,
      consumed_plan: plan,
      note: `${plan} 분석 열람 (${cost}cr 소모)`,
    })

    return NextResponse.json({ success: true, creditsUsed: cost, remaining: credits.balance - cost })
  } catch (err) {
    console.error('credits/consume error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
