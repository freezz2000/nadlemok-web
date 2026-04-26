import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/projects/end-test
 * Body: { projectId }
 *
 * 테스트 종료: projects.status  testing → analyzing
 *             surveys.status   active  → closed
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { projectId } = await req.json()
    if (!projectId) return NextResponse.json({ error: 'projectId 필요' }, { status: 400 })

    // 프로젝트 소유권 + 상태 확인
    const { data: project } = await admin
      .from('projects')
      .select('id, client_id, status')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    if (project.client_id !== user.id) return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    if (project.status !== 'testing') {
      return NextResponse.json({ error: '테스트 진행 중인 프로젝트만 종료할 수 있습니다.' }, { status: 409 })
    }

    // 프로젝트 → analyzing
    const { error: projErr } = await admin
      .from('projects')
      .update({ status: 'analyzing' })
      .eq('id', projectId)
    if (projErr) throw projErr

    // 설문 → closed
    await admin
      .from('surveys')
      .update({ status: 'closed' })
      .eq('project_id', projectId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[projects/end-test]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
