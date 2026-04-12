import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { projectId, emails } = await req.json() as { projectId: string; emails: string[] }

    if (!projectId || !emails?.length) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 프로젝트 + 설문 정보 조회
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
      .single()

    const results = []

    for (const email of emails) {
      const trimmed = email.trim().toLowerCase()
      if (!trimmed) continue

      // 이미 초대된 경우 건너뜀
      const { data: existing } = await supabase
        .from('project_invitations')
        .select('id, status, token')
        .eq('project_id', projectId)
        .eq('email', trimmed)
        .single()

      if (existing && existing.status === 'accepted') {
        results.push({ email: trimmed, status: 'already_accepted' })
        continue
      }

      let token: string

      if (existing) {
        // 이미 초대가 있으면 토큰 재사용 (상태 리셋)
        await supabase
          .from('project_invitations')
          .update({ status: 'pending', expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() })
          .eq('id', existing.id)
        token = existing.token
      } else {
        // 새 초대 생성
        const { data: invite, error } = await supabase
          .from('project_invitations')
          .insert({
            project_id: projectId,
            survey_id: survey?.id ?? null,
            email: trimmed,
          })
          .select('token')
          .single()

        if (error || !invite) {
          results.push({ email: trimmed, status: 'error', message: error?.message })
          continue
        }
        token = invite.token
      }

      // 초대 이메일 발송
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'}/invite/${token}`

      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error: emailError } = await resend.emails.send({
          from: '나들목 <onboarding@resend.dev>',
          to: trimmed,
          subject: `[나들목] 제품 테스트 패널 초대 — ${project.product_name}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
              <h2 style="color: #1B2A4A; font-size: 22px; margin-bottom: 8px;">제품 테스트에 초대합니다</h2>
              <p style="color: #64748B; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
                <strong style="color: #1E293B;">${project.product_name}</strong> 테스트 패널로 초대되었습니다.<br>
                아래 버튼을 클릭해 설문에 참여해주세요.
              </p>
              <a href="${inviteUrl}"
                style="display: inline-block; background: #1B2A4A; color: white; padding: 14px 28px;
                       border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600;">
                패널 참여하기
              </a>
              <p style="color: #94A3B8; font-size: 12px; margin-top: 32px; line-height: 1.6;">
                이 초대 링크는 14일 후 만료됩니다.<br>
                본 메일은 발신 전용입니다.
              </p>
            </div>
          `,
        })
        if (emailError) {
          console.error('resend error:', emailError)
          results.push({ email: trimmed, status: 'email_failed', message: emailError.message })
        } else {
          results.push({ email: trimmed, status: 'sent' })
        }
      } catch (emailErr) {
        console.error('resend exception:', emailErr)
        results.push({ email: trimmed, status: 'email_failed', message: String(emailErr) })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('invite/send error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
