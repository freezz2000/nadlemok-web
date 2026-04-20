/**
 * POST /api/invite/remind
 * 미응답 패널에게 설문 마감 독촉 알림톡 발송
 * Body: { projectId: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendReminder } from '@/lib/aligo'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // 인증 (클라이언트 본인 or 관리자)
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const { projectId } = await req.json() as { projectId: string }
    if (!projectId) return NextResponse.json({ error: 'projectId 필요' }, { status: 400 })

    // 프로젝트 조회 및 권한 확인
    const { data: project } = await admin
      .from('projects')
      .select('id, client_id, product_name')
      .eq('id', projectId)
      .single()

    if (!project) return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isOwner = project.client_id === user.id
    if (!isAdmin && !isOwner) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

    // 설문 마감일 조회
    const { data: survey } = await admin
      .from('surveys')
      .select('id, end_date, status')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 미가입 or 가입했지만 미응답인 패널 전화번호 조회
    const { data: invitations } = await admin
      .from('project_invitations')
      .select('id, phone, panel_id, status')
      .eq('project_id', projectId)
      .eq('status', 'pending')   // 아직 미가입

    if (!invitations?.length) {
      return NextResponse.json({ sent: 0, message: '발송 대상이 없습니다 (미가입 패널 0명)' })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'

    // 마감일 포맷 (end_date 없으면 '마감 예정일' 표시)
    const deadlineLabel = survey?.end_date
      ? new Date(survey.end_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
      : '마감 예정일'

    const results: { phone: string; status: string; message?: string }[] = []

    for (const inv of invitations) {
      if (!inv.phone) continue

      // 초대 링크를 설문 링크로 활용 (이미 초대받은 경우 inviteUrl로 재접근)
      const surveyUrl = survey?.id
        ? `${appUrl}/panel/surveys/${survey.id}`
        : `${appUrl}/panel/dashboard`

      const { ok, message } = await sendReminder(
        inv.phone,
        project.product_name,
        deadlineLabel,
        surveyUrl
      )

      results.push({ phone: inv.phone, status: ok ? 'sent' : 'failed', message })
    }

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status === 'failed').length

    return NextResponse.json({ sent, failed, results })
  } catch (err) {
    console.error('invite/remind error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
