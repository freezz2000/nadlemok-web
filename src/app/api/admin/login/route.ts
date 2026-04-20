import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { username, password } = await req.json()

  // 환경변수 (앞뒤 공백 제거)
  const ADMIN_USERNAME = (process.env.ADMIN_USERNAME ?? 'linebreakers').trim()
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim()
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim()

  if (!ADMIN_PASSWORD || !ADMIN_EMAIL) {
    return NextResponse.json({ error: '서버 설정 오류입니다. (환경변수 미설정)' }, { status: 500 })
  }

  // 1단계: 아이디/비밀번호 검증
  if (username.trim() !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
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

  // 2단계: Supabase 로그인 시도
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  // 로그인 실패 → 서비스 롤로 admin 계정 자동 생성/수정
  if (signInError) {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let adminUserId: string

    // 기존 계정 확인
    const { data: usersData } = await adminClient.auth.admin.listUsers()
    const existing = usersData?.users?.find((u) => u.email === ADMIN_EMAIL)

    if (existing) {
      // 계정 있음 → 비밀번호 동기화
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      })
      adminUserId = existing.id
    } else {
      // 계정 없음 → 신규 생성
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
      })
      if (createError || !newUser.user) {
        return NextResponse.json({ error: `관리자 계정 생성 실패: ${createError?.message}` }, { status: 500 })
      }
      adminUserId = newUser.user.id
    }

    // profiles 테이블에 admin 역할 등록
    await adminClient.from('profiles').upsert(
      { id: adminUserId, email: ADMIN_EMAIL, role: 'admin', name: '관리자' },
      { onConflict: 'id' }
    )

    // 다시 로그인
    const { error: retryError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    })

    if (retryError) {
      return NextResponse.json({ error: `관리자 인증 실패: ${retryError.message}` }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
