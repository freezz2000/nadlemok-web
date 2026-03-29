import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  // 아이디 검증
  if (username !== process.env.ADMIN_USERNAME) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  // Supabase 로그인 (관리자 이메일 + 비밀번호)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.ADMIN_EMAIL!,
    password,
  })

  if (error) {
    return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}
