import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/payment/delivery-confirm
 * 배송 대행료 결제 승인 + 설문 시작
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { paymentKey, orderId, amount, projectId, surveyId } = await req.json()

    if (!paymentKey || !orderId || !amount || !projectId || !surveyId) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 1. 프로젝트 소유권 확인
    const { data: project } = await admin
      .from('projects')
      .select('client_id, delivery_service')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    if (!project.delivery_service) return NextResponse.json({ error: '배송 대행 신청이 없는 프로젝트입니다.' }, { status: 400 })

    // 2. TossPayments 서버 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY!
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
      console.error('[delivery-confirm] Toss error:', tossData)
      return NextResponse.json({ error: tossData.message ?? '결제 승인에 실패했습니다.' }, { status: 400 })
    }

    // 3. 결제 이력 저장
    await admin.from('payments').insert({
      user_id: user.id,
      project_id: projectId,
      order_id: orderId,
      payment_key: paymentKey,
      amount,
      plan: 'delivery',
      status: 'DONE',
      paid_at: tossData.approvedAt ?? new Date().toISOString(),
    })

    // 4. 설문 시작 (status: 'active')
    const { error: surveyErr } = await admin
      .from('surveys')
      .update({ status: 'active' })
      .eq('id', surveyId)

    if (surveyErr) {
      console.error('[delivery-confirm] survey start error:', surveyErr)
      return NextResponse.json({ error: '결제는 완료됐으나 설문 시작에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[delivery-confirm]', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
