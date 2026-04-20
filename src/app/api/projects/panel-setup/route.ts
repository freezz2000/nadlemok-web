import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { calculateQuote } from '@/lib/pricing'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const {
    projectId,
    panelSource,
    externalPanelCount,
    deliveryService,
    ageRanges,
    skinTypes,
    skinConcerns,
  } = await req.json()

  if (!projectId || !panelSource) {
    return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
  }

  // 프로젝트 존재 및 권한 확인
  const { data: project } = await admin
    .from('projects')
    .select('status, client_id')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  // 이미 처리된 프로젝트 중복 방지 (멱등성 보장)
  if (project.status !== 'draft' && project.status !== 'pending') {
    return NextResponse.json({ ok: true, alreadyProcessed: true })
  }

  const hasExternal = panelSource === 'external' || panelSource === 'mixed'
  const creditsToConsume = hasExternal ? (externalPanelCount ?? 30) : 0

  // ✅ 크레딧 차감 먼저 — 프로젝트 상태 변경 전에 처리
  if (hasExternal) {
    // 현재 잔액 조회
    const { data: cr } = await admin
      .from('client_credits')
      .select('balance')
      .eq('client_id', user.id)
      .single()

    if (!cr || cr.balance < creditsToConsume) {
      return NextResponse.json({ error: '크레딧이 부족합니다.' }, { status: 402 })
    }

    // 낙관적 잠금: balance가 읽은 값과 동일할 때만 업데이트 (동시 요청 방지)
    const { data: deducted } = await admin
      .from('client_credits')
      .update({ balance: cr.balance - creditsToConsume, updated_at: new Date().toISOString() })
      .eq('client_id', user.id)
      .eq('balance', cr.balance)
      .select('balance')

    if (!deducted || deducted.length === 0) {
      return NextResponse.json(
        { error: '크레딧 처리 중 오류가 발생했습니다. 다시 시도해주세요.' },
        { status: 409 }
      )
    }

    await admin.from('credit_transactions').insert({
      client_id: user.id,
      amount: -creditsToConsume,
      transaction_type: 'consume',
      project_id: projectId,
      note: `외부 패널 ${creditsToConsume}명 검증 (${creditsToConsume}cr 소모)`,
    })
  }

  const quote = hasExternal
    ? calculateQuote(externalPanelCount, deliveryService)
    : { total: 0, operationFee: 0, deliveryServiceFee: 0 }

  // 프로젝트 상태 업데이트 (크레딧 차감 성공 후)
  const { error: projErr } = await admin
    .from('projects')
    .update({
      panel_source: panelSource,
      external_panel_count: hasExternal ? externalPanelCount : 0,
      delivery_service: hasExternal ? deliveryService : false,
      operation_fee: hasExternal ? quote.operationFee : 0,
      delivery_service_fee: hasExternal ? quote.deliveryServiceFee : 0,
      quote_total: quote.total,
      status: 'draft', // 패널유형 설정 후 항상 설문설정(draft) 단계로 이동
    })
    .eq('id', projectId)

  if (projErr) {
    // 크레딧은 이미 차감됨 — 로그 기록 후 클라이언트에 오류 반환
    console.error('panel-setup project update error (credits already deducted):', projErr)
    return NextResponse.json({ error: projErr.message }, { status: 500 })
  }

  // 외부 패널 조건 저장
  if (hasExternal) {
    await admin
      .from('panel_conditions')
      .upsert({
        project_id: projectId,
        age_ranges: ageRanges ?? [],
        skin_types: skinTypes ?? [],
        skin_concerns: skinConcerns ?? [],
      }, { onConflict: 'project_id' })
  }

  return NextResponse.json({ ok: true, quoteTotal: quote.total })
}
