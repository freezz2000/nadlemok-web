import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? 'linebreakers'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL

  if (!ADMIN_PASSWORD || !ADMIN_EMAIL) {
    return NextResponse.json({ error: '서버 설정 오류입니다.' }, { status: 500 })
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
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

  const { error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (error) {
    return NextResponse.json({ error: '관리자 인증에 실패했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
