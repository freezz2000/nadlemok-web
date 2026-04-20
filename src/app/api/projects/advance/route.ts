import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/projects/advance
 * 설문 완료 후 다음 단계로 진행:
 *   - 내부 패널 (draft → testing): 즉시 테스트 시작
 *   - 외부 패널 (draft → matching): 관리자 패널 배정 대기
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId 필요' }, { status: 400 })

    // 프로젝트 조회
    const { data: project } = await admin
      .from('projects')
      .select('id, client_id, status, panel_source')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    if (project.status !== 'draft') return NextResponse.json({ error: '설문 설정 단계에서만 진행할 수 있습니다.' }, { status: 409 })

    const isInternal = project.panel_source === 'internal'
    const nextStatus = isInternal ? 'testing' : 'matching'

    // 프로젝트 상태 업데이트
    const { error: projErr } = await admin
      .from('projects')
      .update({ status: nextStatus })
      .eq('id', projectId)

    if (projErr) {
      console.error('advance status error:', projErr)
      return NextResponse.json({ error: projErr.message }, { status: 500 })
    }

    // 내부 패널: 설문 활성화 (테스트 시작)
    if (isInternal) {
      await admin
        .from('surveys')
        .update({ status: 'active' })
        .eq('project_id', projectId)
    }

    return NextResponse.json({ ok: true, nextStatus })
  } catch (err) {
    console.error('advance error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
