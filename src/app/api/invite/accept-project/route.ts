import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 프로젝트 초대 토큰으로 프로젝트 정보 조회 (랜딩 페이지용)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: '토큰 누락' }, { status: 400 })

  const { data: project } = await supabase
    .from('projects')
    .select(`
      id, product_name, product_category, client_id,
      survey:surveys(id, title, status)
    `)
    .eq('invite_token', token)
    .single()

  if (!project) {
    return NextResponse.json({ error: '유효하지 않은 초대 링크입니다' }, { status: 404 })
  }

  // 가장 최신 설문 하나만 반환
  const surveys = Array.isArray(project.survey) ? project.survey : []
  const latestSurvey = surveys.length > 0 ? surveys[surveys.length - 1] : null

  return NextResponse.json({
    project: {
      id: project.id,
      product_name: project.product_name,
      product_category: project.product_category,
      client_id: project.client_id,
    },
    survey: latestSurvey,
  })
}

// POST: 프로젝트 초대 수락 (패널 등록 + survey_panels 생성)
export async function POST(req: NextRequest) {
  try {
    const { projectToken, panelId, clientId } = await req.json() as {
      projectToken: string
      panelId: string
      clientId?: string
    }

    if (!projectToken || !panelId) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 프로젝트 조회
    const { data: project } = await supabase
      .from('projects')
      .select('id, client_id')
      .eq('invite_token', projectToken)
      .single()

    if (!project) {
      return NextResponse.json({ error: '유효하지 않은 초대 링크입니다' }, { status: 404 })
    }

    // 최신 설문 조회
    const { data: surveys } = await supabase
      .from('surveys')
      .select('id, status')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)

    const survey = surveys?.[0] ?? null

    // survey_panels 생성 (설문이 있으면)
    if (survey) {
      await supabase
        .from('survey_panels')
        .upsert(
          { survey_id: survey.id, panel_id: panelId, status: 'matched' },
          { onConflict: 'survey_id,panel_id' }
        )
    }

    // client_panels 풀에 추가
    const resolvedClientId = clientId || project.client_id
    if (resolvedClientId) {
      await supabase
        .from('client_panels')
        .upsert(
          { client_id: resolvedClientId, panel_id: panelId },
          { onConflict: 'client_id,panel_id', ignoreDuplicates: true }
        )
    }

    return NextResponse.json({
      ok: true,
      surveyId: survey?.id ?? null,
      projectId: project.id,
    })
  } catch (err) {
    console.error('accept-project error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
