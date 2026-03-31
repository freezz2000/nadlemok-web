import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 관리자 로그인 페이지는 인증 불필요
  if (request.nextUrl.pathname === '/admin-login') {
    return supabaseResponse
  }

  // 보호된 라우트 체크
  const isDashboard = request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/client') ||
    request.nextUrl.pathname.startsWith('/panel') ||
    request.nextUrl.pathname.startsWith('/payment')

  if (isDashboard && !user) {
    const url = request.nextUrl.clone()
    // admin 경로는 admin 전용 로그인으로
    url.pathname = request.nextUrl.pathname.startsWith('/admin') ? '/admin-login' : '/login'
    return NextResponse.redirect(url)
  }

  // 로그인된 사용자가 auth 페이지 접근 시 대시보드로 리다이렉트
  // /register/panel은 신규 패널 가입 직후 프로필 설정 페이지이므로 제외
  const isAuth = request.nextUrl.pathname.startsWith('/login') ||
    (request.nextUrl.pathname.startsWith('/register') &&
      request.nextUrl.pathname !== '/register/panel')

  if (isAuth && user) {
    // 역할에 따라 리다이렉트
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    if (profile?.role === 'admin') url.pathname = '/admin'
    else if (profile?.role === 'client') url.pathname = '/client'
    else url.pathname = '/panel'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
