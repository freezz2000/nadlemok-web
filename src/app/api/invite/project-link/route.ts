import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// GET /api/invite/project-link?projectId=xxx
// 프로젝트 단위 초대 링크 반환 (전화번호 불필요)
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'projectId 누락' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 로그인한 고객사 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 프로젝트 조회 (소유자 확인)
  const { data: project } = await admin
    .from('projects')
    .select('id, client_id, invite_token')
    .eq('id', projectId)
    .eq('client_id', user.id)
    .single()

  if (!project) {
    return NextResponse.json({ error: '프로젝트를 찾을 수 없습니다' }, { status: 404 })
  }

  // invite_token이 없으면 새로 생성
  let token = project.invite_token
  if (!token) {
    const newToken = crypto.randomUUID().replace(/-/g, '')
    await admin
      .from('projects')
      .update({ invite_token: newToken })
      .eq('id', projectId)
    token = newToken
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://linebreakers.co.kr'
  const url = `${appUrl}/invite/p/${token}?client=${user.id}`

  return NextResponse.json({ url, token })
}
