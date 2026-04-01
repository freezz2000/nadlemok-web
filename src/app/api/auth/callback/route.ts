import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  const role = url.searchParams.get('role') ?? 'panel'

  console.log('[callback] url:', req.url)
  console.log('[callback] code:', code ? 'exists' : 'MISSING')
  console.log('[callback] next:', next, '| role:', role)

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    console.log('[callback] exchangeCodeForSession error:', error?.message ?? 'none')

    if (!error && data.user) {
      // 프로필에 role 업데이트 (소셜 가입 시 role이 없을 수 있음)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (!profile?.role) {
        await supabase
          .from('profiles')
          .upsert({ id: data.user.id, role, name: data.user.user_metadata?.full_name ?? '' })
      }

      const effectiveRole = profile?.role ?? role
      console.log('[callback] profile.role:', profile?.role, '| effectiveRole:', effectiveRole)

      // 패널이면 panel_profiles 완성 여부에 따라 분기
      if (effectiveRole === 'panel') {
        const { data: panelProfile } = await supabase
          .from('panel_profiles')
          .select('id, skin_type')
          .eq('id', data.user.id)
          .single()

        console.log('[callback] panelProfile skin_type:', panelProfile?.skin_type)
        if (panelProfile?.skin_type) {
          // 프로필 완성된 기존 패널 → 대시보드
          console.log('[callback] → /panel')
          return NextResponse.redirect(new URL('/panel', url.origin))
        }
        // 신규 또는 프로필 미완성 패널 → 프로필 등록
        console.log('[callback] → /register/panel')
        return NextResponse.redirect(new URL('/register/panel', url.origin))
      }

      // 클라이언트면 프로필 완성 여부에 따라 분기
      if (effectiveRole === 'client') {
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('terms_agreed_at')
          .eq('id', data.user.id)
          .single()

        if (clientProfile?.terms_agreed_at) {
          return NextResponse.redirect(new URL('/client', url.origin))
        }
        return NextResponse.redirect(new URL('/register/client', url.origin))
      }

      return NextResponse.redirect(new URL(next, url.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
