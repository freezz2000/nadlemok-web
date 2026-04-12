import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendAlimtalk(phone: string, productName: string, inviteUrl: string): Promise<{ ok: boolean; message?: string }> {
  const apiKey = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const senderKey = process.env.ALIGO_SENDER_KEY
  const tplCode = process.env.ALIGO_TEMPLATE_CODE
  const sender = process.env.ALIGO_SENDER_PHONE

  if (!apiKey || !userId || !senderKey || !tplCode || !sender) {
    return { ok: false, message: '알리고 환경변수 미설정' }
  }

  // 템플릿 변수 치환된 메시지 (등록한 템플릿과 동일하게)
  const message = `[나들목] 제품 테스트 패널 초대\n\n${productName} 테스트 패널로 초대드립니다.\n\n아래 버튼을 클릭하여 참여해 주세요.\n초대 링크는 14일 후 만료됩니다.`

  const button = JSON.stringify({
    button: [
      {
        name: '패널 참여하기',
        linkType: 'WL',
        linkTypeName: '웹링크',
        linkPc: inviteUrl,
        linkMo: inviteUrl,
      },
    ],
  })

  const params = new URLSearchParams({
    apikey: apiKey,
    userid: userId,
    senderkey: senderKey,
    tpl_code: tplCode,
    sender,
    receiver_1: phone.replace(/-/g, ''),
    recvname_1: '패널',
    message_1: message,
    button_1: button,
  })

  const res = await fetch('https://kakaoapi.aligo.in/akv10/alimtalk/send/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()

  // 알리고 응답: code 0 = 성공
  if (data.code === 0) {
    return { ok: true }
  }
  return { ok: false, message: data.message || `알리고 오류 (code: ${data.code})` }
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, phones } = await req.json() as { projectId: string; phones: string[] }

    if (!projectId || !phones?.length) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    // 프로젝트 정보 조회
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
        // 기존 초대 재발송 (상태 리셋)
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
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'}/invite/${token}`
      const { ok, message } = await sendAlimtalk(trimmed, project.product_name, inviteUrl)

      if (ok) {
        results.push({ phone: trimmed, status: 'sent' })
      } else {
        results.push({ phone: trimmed, status: 'alimtalk_failed', message })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    console.error('invite/send error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
