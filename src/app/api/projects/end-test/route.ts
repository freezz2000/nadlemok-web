import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ANALYSIS_API = process.env.ANALYSIS_API_URL ?? 'http://localhost:8000'

/**
 * POST /api/projects/end-test
 * Body: { projectId }
 *
 * 테스트 종료:
 *   1. projects.status  testing → analyzing
 *   2. surveys.status   active  → closed
 *   3. Python 분석 서버 자동 트리거 (fire-and-forget)
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

    // 1. 프로젝트 → analyzing
    const { error: projErr } = await admin
      .from('projects')
      .update({ status: 'analyzing' })
      .eq('id', projectId)
    if (projErr) throw projErr

    // 2. 설문 → closed
    await admin
      .from('surveys')
      .update({ status: 'closed' })
      .eq('project_id', projectId)

    // 3. Python 분석 서버 자동 트리거 (fire-and-forget)
    //    응답을 기다리지 않으므로 분석 서버가 느려도 클라이언트에 영향 없음
    triggerAnalysis(projectId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[projects/end-test]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

/**
 * 분석 서버에 비동기 분석 요청.
 * await 없이 호출해 fire-and-forget으로 동작.
 * 분석 서버가 응답하면 /api/analysis 콜백으로 결과를 저장.
 */
async function triggerAnalysis(projectId: string) {
  try {
    const res = await fetch(`${ANALYSIS_API}/analyze/${projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 30초 타임아웃: 분석 서버 연결 확인용 (실제 분석은 서버에서 비동기)
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[end-test] 분석 서버 오류 (${res.status}):`, body)
    } else {
      console.log(`[end-test] 분석 트리거 성공 — projectId: ${projectId}`)
    }
  } catch (err) {
    // 분석 서버가 꺼져 있거나 타임아웃 → 로그만 남기고 무시
    // 프로젝트 status는 이미 analyzing이므로 어드민이 수동으로 재시도 가능
    console.error(`[end-test] 분석 서버 연결 실패 — projectId: ${projectId}`, err)
  }
}
