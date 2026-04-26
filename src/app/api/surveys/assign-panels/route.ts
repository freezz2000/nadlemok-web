import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: survey_panels 조회 (클라이언트 RLS 우회용 — survey_panels에 클라이언트 SELECT 정책 없음)
export async function GET(req: NextRequest) {
  const surveyId = req.nextUrl.searchParams.get('surveyId')
  if (!surveyId) return NextResponse.json({ panels: [] })

  const { data, error } = await supabase
    .from('survey_panels')
    .select('panel_id, status')
    .eq('survey_id', surveyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ panels: data ?? [] })
}

// POST: survey_panels 에 패널 추가 / 제거
export async function POST(req: NextRequest) {
  try {
    const { surveyId, panelIds, action } = await req.json() as {
      surveyId: string
      panelIds: string[]
      action: 'add' | 'remove'
    }

    if (!surveyId || !panelIds?.length || !action) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    if (action === 'add') {
      const { error } = await supabase
        .from('survey_panels')
        .upsert(
          panelIds.map((panelId) => ({ survey_id: surveyId, panel_id: panelId, status: 'matched' })),
          { onConflict: 'survey_id,panel_id', ignoreDuplicates: true }
        )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (action === 'remove') {
      // 이미 설문을 완료한 패널은 제거하지 않음
      const { error } = await supabase
        .from('survey_panels')
        .delete()
        .eq('survey_id', surveyId)
        .in('panel_id', panelIds)
        .neq('status', 'completed')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('assign-panels error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
