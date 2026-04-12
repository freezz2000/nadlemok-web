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

  const hasExternal = panelSource === 'external' || panelSource === 'mixed'
  const quote = hasExternal
    ? calculateQuote(externalPanelCount, deliveryService)
    : { total: 0, operationFee: 0, deliveryServiceFee: 0 }

  // projects 업데이트
  const { error: projErr } = await admin
    .from('projects')
    .update({
      panel_source: panelSource,
      external_panel_count: hasExternal ? externalPanelCount : 0,
      delivery_service: hasExternal ? deliveryService : false,
      operation_fee: hasExternal ? quote.operationFee : 0,
      delivery_service_fee: hasExternal ? quote.deliveryServiceFee : 0,
      quote_total: quote.total,
      status: hasExternal ? 'matching' : 'draft',
    })
    .eq('id', projectId)

  if (projErr) {
    console.error('panel-setup project update error:', projErr)
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
