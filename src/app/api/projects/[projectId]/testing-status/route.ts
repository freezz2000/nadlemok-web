import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/projects/[projectId]/testing-status
 *
 * 테스트 진행 중 상태의 패널 응답 현황 반환.
 * survey_panels, survey_responses, profiles, panel_profiles 모두
 * 클라이언트 RLS가 없으므로 서비스롤 키로 조회.
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

  // 설문 조회 (최신 1개)
  const { data: survey } = await admin
    .from('surveys')
    .select('id, status, questions')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!survey) {
    return NextResponse.json({ survey: null, panels: [], responded_count: 0, total_count: 0 })
  }

  const questions: { key: string; label: string; type: string; group?: string; isKillSignal?: boolean; scaleLabels?: string[]; choices?: string[] }[]
    = Array.isArray(survey.questions) ? survey.questions : []

  // survey_panels 조회
  const { data: sp } = await admin
    .from('survey_panels')
    .select('panel_id, status, matched_at')
    .eq('survey_id', survey.id)

  const panelRows = sp || []
  const panelIds = panelRows.map((r: { panel_id: string }) => r.panel_id)

  if (panelIds.length === 0) {
    return NextResponse.json({
      survey: {
        id: survey.id,
        status: survey.status,
        questions_count: questions.length,
        questions,
      },
      panels: [],
      responded_count: 0,
      total_count: 0,
    })
  }

  // 패널 이름 + 프로필 + 응답 병렬 조회
  const [{ data: profiles }, { data: panelProfiles }, { data: responses }] = await Promise.all([
    admin.from('profiles').select('id, name').in('id', panelIds),
    admin.from('panel_profiles').select('id, gender, age_group, skin_type, skin_concern').in('id', panelIds),
    admin.from('survey_responses')
      .select('panel_id, responses, open_weakness, open_improvement, responded_at, response_duration_sec, day_checkpoint')
      .eq('survey_id', survey.id),
  ])

  const nameMap: Record<string, string> = {}
  for (const p of (profiles ?? [])) nameMap[p.id as string] = (p.name as string) || ''

  const ppMap: Record<string, { gender: string; age_group: string; skin_type: string; skin_concern: string }> = {}
  for (const pp of (panelProfiles ?? [])) {
    ppMap[pp.id as string] = {
      gender: (pp.gender as string) || '-',
      age_group: (pp.age_group as string) || '-',
      skin_type: (pp.skin_type as string) || '-',
      skin_concern: (pp.skin_concern as string) || '-',
    }
  }

  // panel_id별로 가장 최근 checkpoint 응답만 보관
  const responseMap: Record<string, {
    responses: Record<string, number | string>
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

  const panels = panelRows.map((row: { panel_id: string; status: string; matched_at: string }) => {
    const resp = responseMap[row.panel_id]
    const scaleValues = resp
      ? Object.values(resp.responses || {}).filter((v): v is number => typeof v === 'number')
      : []
    const avgScore = scaleValues.length > 0
      ? Math.round((scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length) * 100) / 100
      : null

    return {
      panel_id: row.panel_id,
      name: nameMap[row.panel_id] || '이름 미등록',
      gender: ppMap[row.panel_id]?.gender ?? '-',
      age_group: ppMap[row.panel_id]?.age_group ?? '-',
      skin_type: ppMap[row.panel_id]?.skin_type ?? '-',
      skin_concern: ppMap[row.panel_id]?.skin_concern ?? '-',
      matched_at: row.matched_at,
      status: row.status,
      has_responded: !!resp,
      avg_score: avgScore,
      answered_count: resp ? Object.keys(resp.responses || {}).length : 0,
      total_questions: scaleQs.length,
      response: resp || null,
    }
  })

  return NextResponse.json({
    survey: {
      id: survey.id,
      status: survey.status,
      questions_count: questions.length,
      questions,
    },
    panels,
    responded_count: Object.keys(responseMap).length,
    total_count: panels.length,
  })
}
