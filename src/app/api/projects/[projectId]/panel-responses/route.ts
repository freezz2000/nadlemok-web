import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/projects/[projectId]/panel-responses
 *
 * 완료된 프로젝트의 패널별 응답 데이터를 반환.
 * survey_panels, survey_responses, profiles 모두 service role 키로 조회.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // 인증 확인
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  // 프로젝트 소유권 확인
  const { data: project } = await admin
    .from('projects')
    .select('id, client_id, status')
    .eq('id', projectId)
    .single()

  if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
  if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })

  // 최신 설문 조회
  const { data: survey } = await admin
    .from('surveys')
    .select('id, questions')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!survey) {
    return NextResponse.json({ questions: [], panels: [], total_questions: 0 })
  }

  const questions: { key: string; label: string; type: string; group?: string; isKillSignal?: boolean; scaleLabels?: string[] }[]
    = Array.isArray(survey.questions) ? survey.questions : []

  // survey_panels 조회
  const { data: sp } = await admin
    .from('survey_panels')
    .select('panel_id, status, matched_at')
    .eq('survey_id', survey.id)

  const panelRows = sp || []
  const panelIds = panelRows.map((r: { panel_id: string }) => r.panel_id)

  if (panelIds.length === 0) {
    return NextResponse.json({ questions, panels: [], total_questions: questions.length })
  }

  // 병렬 조회: 패널 이름 + 전체 응답
  const [{ data: profiles }, { data: responses }] = await Promise.all([
    admin.from('profiles').select('id, name').in('id', panelIds),
    admin
      .from('survey_responses')
      .select('panel_id, responses, open_weakness, open_improvement, responded_at, response_duration_sec, day_checkpoint')
      .eq('survey_id', survey.id),
  ])

  const nameMap: Record<string, string> = {}
  for (const p of (profiles ?? [])) nameMap[p.id as string] = (p.name as string) || ''

  // panel_id별로 가장 최근 checkpoint 응답만 보관
  const responseMap: Record<string, {
    responses: Record<string, number | string>  // scale: number, choice: string
    open_weakness: string | null
    open_improvement: string | null
    responded_at: string | null
    response_duration_sec: number | null
    day_checkpoint: number
  }> = {}

  for (const r of (responses ?? [])) {
    const pid = r.panel_id as string
    const ckpt = (r.day_checkpoint as number) ?? 1
    if (!responseMap[pid] || ckpt > responseMap[pid].day_checkpoint) {
      responseMap[pid] = {
        responses: (r.responses as Record<string, number | string>) || {},
        open_weakness: (r.open_weakness as string) || null,
        open_improvement: (r.open_improvement as string) || null,
        responded_at: (r.responded_at as string) || null,
        response_duration_sec: (r.response_duration_sec as number) || null,
        day_checkpoint: ckpt,
      }
    }
  }

  const scaleQs = questions.filter(q => q.type === 'scale')
  const scaleTotal = scaleQs.length
  const hasTextWeak = questions.some(q => q.type === 'text' && q.key.includes('weakness'))
  const hasTextImpr = questions.some(q => q.type === 'text' && q.key.includes('improvement'))
  const textTotal = (hasTextWeak ? 1 : 0) + (hasTextImpr ? 1 : 0)

  const panels = panelRows.map((row: { panel_id: string; status: string; matched_at: string }) => {
    const resp = responseMap[row.panel_id]
    const scaleAnswered = resp ? Object.keys(resp.responses || {}).length : 0
    const textAnswered = resp
      ? ((resp.open_weakness ? 1 : 0) + (resp.open_improvement ? 1 : 0))
      : 0

    // 전체 평균점수 (scale 문항만, choice string 제외)
    const scaleValues = resp
      ? Object.values(resp.responses || {}).filter((v): v is number => typeof v === 'number')
      : []
    const avgScore = scaleValues.length > 0
      ? Math.round((scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length) * 100) / 100
      : null

    return {
      panel_id: row.panel_id,
      name: nameMap[row.panel_id] || '이름 미등록',
      status: row.status,
      matched_at: row.matched_at,
      has_responded: !!resp,
      answered_count: scaleAnswered + textAnswered,
      total_questions: scaleTotal + textTotal,
      avg_score: avgScore,
      response: resp || null,
    }
  })

  return NextResponse.json({ questions, panels, total_questions: questions.length })
}
