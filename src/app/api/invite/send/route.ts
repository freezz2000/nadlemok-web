import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendInvite } from '@/lib/aligo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { projectId, phones } = await req.json() as { projectId: string; phones: string[] }

    if (!projectId || !phones?.length) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, product_name, client_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: survey } = await supabase
      .from('surveys')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const results = []
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'

    for (const phone of phones) {
      const trimmed = phone.trim().replace(/-/g, '')
      if (!trimmed) continue

      // 이미 수락한 경우 건너뜀
      const { data: existing } = await supabase
        .from('project_invitations')
        .select('id, status, token')
        .eq('project_id', projectId)
        .eq('phone', trimmed)
        .maybeSingle()

      if (existing?.status === 'accepted') {
        results.push({ phone: trimmed, status: 'already_accepted' })
        continue
      }

      let token: string

      if (existing) {
        // 기존 초대 재발송
        await supabase
          .from('project_invitations')
          .update({
            status: 'pending',
            expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq('id', existing.id)
        token = existing.token
      } else {
        // 새 초대 생성
        const { data: invite, error } = await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            survey_id: survey?.id ?? null,
            phone: trimmed,
          })
          .select('token')
          .single()

        if (error || !invite) {
          results.push({ phone: trimmed, status: 'error', message: error?.message })
          continue
        }
        token = invite.token
      }

      // 알림톡 발송
      const inviteUrl = `${appUrl}/invite/${token}`
      const { ok, message } = await sendInvite(trimmed, project.product_name, inviteUrl)

      results.push({ phone: trimmed, status: ok ? 'sent' : 'alimtalk_failed', message })
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('invite/send error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
