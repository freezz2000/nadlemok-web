import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 토큰 검증 (초대 정보 반환)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: '토큰 누락' }, { status: 400 })

  const { data: invitation } = await supabase
    .from('project_invitations')
    .select(`
      id, token, email, status, expires_at,
      project:projects(id, product_name, product_category),
      survey:surveys(id, title)
    `)
    .eq('token', token)
    .single()

  if (!invitation) return NextResponse.json({ error: '유효하지 않은 초대 링크입니다' }, { status: 404 })
  if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
    await supabase.from('project_invitations').update({ status: 'expired' }).eq('id', invitation.id)
    return NextResponse.json({ error: '만료된 초대 링크입니다' }, { status: 410 })
  }

  return NextResponse.json({ invitation })
}

// POST: 초대 수락 (패널 연결)
export async function POST(req: NextRequest) {
  try {
    const { token, panelId, clientId } = await req.json() as { token: string; panelId: string; clientId?: string }
    if (!token || !panelId) return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })

    const { data: invitation } = await supabase
      .from('project_invitations')
      .select('id, project_id, survey_id, status, expires_at, panel_id, phone')
      .eq('token', token)
      .single()

    if (!invitation) return NextResponse.json({ error: '유효하지 않은 초대' }, { status: 404 })
    if (new Date(invitation.expires_at) < new Date()) return NextResponse.json({ error: '만료된 초대' }, { status: 410 })
    if (invitation.status === 'accepted' && invitation.panel_id === panelId) {
      return NextResponse.json({ surveyId: invitation.survey_id, projectId: invitation.project_id })
    }

    // 초대 수락 처리
    await supabase
      .from('project_invitations')
      .update({ status: 'accepted', panel_id: panelId, accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // 패널 프로필 타입을 'invited'로 설정
    await supabase
      .from('panel_profiles')
      .upsert({ id: panelId, panel_type: 'invited' }, { onConflict: 'id', ignoreDuplicates: false })

    // 설문-패널 매칭 생성
    if (invitation.survey_id) {
      await supabase
        .from('survey_panels')
        .upsert({ survey_id: invitation.survey_id, panel_id: panelId, status: 'matched' }, { onConflict: 'survey_id,panel_id' })
    }

    // 고객사 패널 풀에 추가 (이미 있으면 무시)
    // clientId: URL 파라미터로 받은 값 우선, 없으면 project 조회로 보완
    let resolvedClientId = clientId
    if (!resolvedClientId) {
      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', invitation.project_id)
        .single()
      resolvedClientId = project?.client_id
    }

    if (resolvedClientId) {
      await supabase
        .from('client_panels')
        .upsert(
          { client_id: resolvedClientId, panel_id: panelId, phone: invitation.phone },
          { onConflict: 'client_id,panel_id', ignoreDuplicates: true }
        )
    }

    return NextResponse.json({ surveyId: invitation.survey_id, projectId: invitation.project_id })
  } catch (err) {
    console.error('invite/accept error:', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
