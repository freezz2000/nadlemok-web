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

    // ── 설문 문항 존재 여부 서버 사이드 검증 ─────────────────────────────
    // 내부/외부 모두 설문이 없거나 문항이 0개면 테스트를 시작할 수 없음
    const { data: survey } = await admin
      .from('surveys')
      .select('id, questions')
      .eq('project_id', projectId)
      .maybeSingle()

    const questionCount = Array.isArray((survey as { questions?: unknown[] } | null)?.questions)
      ? ((survey as { questions: unknown[] }).questions).length
      : 0

    if (!survey || questionCount === 0) {
      return NextResponse.json(
        { error: '설문 문항을 먼저 설정해주세요. 설문이 없거나 문항이 없으면 테스트를 시작할 수 없습니다.' },
        { status: 422 }
      )
    }

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

    // 내부 패널: 설문은 여기서 활성화하지 않음
    // → 초대 페이지에서 패널을 선택한 뒤 "설문 시작하기" 버튼으로 별도 활성화
    // (외부 패널도 동일 — 관리자가 매칭 후 별도 처리)

    return NextResponse.json({ ok: true, nextStatus })
  } catch (err) {
    console.error('advance error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
