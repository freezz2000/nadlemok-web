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
        questions_count: Array.isArray(survey.questions) ? survey.questions.length : 0,
      },
      panels: [],
      responded_count: 0,
      total_count: 0,
    })
  }

  // 패널 이름 + 프로필 병렬 조회
  const [{ data: profiles }, { data: panelProfiles }, { data: responses }] = await Promise.all([
    admin.from('profiles').select('id, name').in('id', panelIds),
    admin.from('panel_profiles').select('id, gender, age_group, skin_type, skin_concern').in('id', panelIds),
    admin.from('survey_responses').select('panel_id').eq('survey_id', survey.id),
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

  const respondedSet = new Set((responses ?? []).map((r: { panel_id: string }) => r.panel_id))

  const panels = panelRows.map((sp: { panel_id: string; status: string; matched_at: string }) => ({
    panel_id: sp.panel_id,
    name: nameMap[sp.panel_id] || '이름 미등록',
    gender: ppMap[sp.panel_id]?.gender ?? '-',
    age_group: ppMap[sp.panel_id]?.age_group ?? '-',
    skin_type: ppMap[sp.panel_id]?.skin_type ?? '-',
    skin_concern: ppMap[sp.panel_id]?.skin_concern ?? '-',
    matched_at: sp.matched_at,
    status: sp.status,
    has_responded: respondedSet.has(sp.panel_id),
  }))

  return NextResponse.json({
    survey: {
      id: survey.id,
      status: survey.status,
      questions_count: Array.isArray(survey.questions) ? survey.questions.length : 0,
    },
    panels,
    responded_count: respondedSet.size,
    total_count: panels.length,
  })
}
