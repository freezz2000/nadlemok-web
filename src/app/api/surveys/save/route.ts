import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * POST /api/surveys/save
 * Body: { projectId, questions, templateId?, status? }
 *
 * surveys 테이블에 클라이언트 INSERT/UPDATE RLS 정책이 없으므로
 * 서비스롤로 저장 처리.
 *
 * 반환: { surveyId }
 */
export async function POST(req: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { projectId, questions, templateId, status } = await req.json() as {
      projectId: string
      questions: unknown[]
      templateId?: string
      status?: string
    }

    if (!projectId) {
      return NextResponse.json({ error: 'projectId가 필요합니다.' }, { status: 400 })
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: '문항이 없습니다.' }, { status: 400 })
    }

    // 프로젝트 소유권 확인
    const { data: project } = await admin
      .from('projects')
      .select('id, client_id, product_name')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다.' }, { status: 404 })
    }
    if (project.client_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    // 기존 설문 확인
    const { data: existing } = await admin
      .from('surveys')
      .select('id')
      .eq('project_id', projectId)
      .maybeSingle()

    let surveyId: string

    if (existing) {
      // 업데이트
      const { error } = await admin
        .from('surveys')
        .update({
          questions,
          template_id: templateId || null,
          ...(status ? { status } : {}),
        })
        .eq('id', existing.id)

      if (error) throw error
      surveyId = existing.id
    } else {
      // 신규 생성
      const { data: created, error } = await admin
        .from('surveys')
        .insert({
          project_id: projectId,
          title: `${project.product_name} 설문`,
          questions,
          template_id: templateId || null,
          day_checkpoint: [1],
          status: status || 'draft',
        })
        .select('id')
        .single()

      if (error) throw error
      surveyId = created.id
    }

    return NextResponse.json({ ok: true, surveyId })
  } catch (err) {
    console.error('[surveys/save]', err)
    return NextResponse.json({ error: '설문 저장에 실패했습니다.' }, { status: 500 })
  }
}
