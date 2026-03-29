import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const role = searchParams.get('role')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Google OAuth 가입 시 role이 메타데이터에 없으면 설정
        if (role && !user.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: {
              role,
              name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            },
          })
        }

        // 프로필 존재 여부 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!profile) {
          // 트리거가 아직 프로필을 생성하지 않았거나, Google 가입 최초 사용자
          // 직접 프로필 생성 시도
          const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ''
          const userRole = role || user.user_metadata?.role || 'panel'

          await supabase.from('profiles').upsert({
            id: user.id,
            role: userRole,
            name: userName,
          })

          if (userRole === 'panel') {
            await supabase.from('panel_profiles').upsert({ id: user.id })
          }

          // next가 있으면 그 페이지로, 아니면 역할별 대시보드로
          const redirectPath = next || (userRole === 'panel' ? '/register/panel' : userRole === 'client' ? '/client' : '/admin')
          return NextResponse.redirect(`${origin}${redirectPath}`)
        }

        // 기존 사용자 — 역할에 따라 리다이렉트
        if (next) {
          return NextResponse.redirect(`${origin}${next}`)
        }

        if (profile.role === 'admin') return NextResponse.redirect(`${origin}/admin`)
        if (profile.role === 'client') return NextResponse.redirect(`${origin}/client`)
        return NextResponse.redirect(`${origin}/panel`)
      }

      return NextResponse.redirect(`${origin}${next || '/'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
