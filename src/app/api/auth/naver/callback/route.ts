import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=naver_failed', origin))
  }

  let role = 'panel'
  let next = '/register/panel'
  try {
    const stateRaw = searchParams.get('state')
    if (stateRaw) {
      const state = JSON.parse(Buffer.from(stateRaw, 'base64url').toString())
      role = state.role ?? 'panel'
      next = state.next ?? '/register/panel'
    }
  } catch {}

  const clientId = process.env.NAVER_CLIENT_ID!
  const clientSecret = process.env.NAVER_CLIENT_SECRET!
  const redirectUri = `${origin}/api/auth/naver/callback`

  // 1. 네이버 액세스 토큰 발급
  const tokenUrl = new URL('https://nid.naver.com/oauth2.0/token')
  tokenUrl.searchParams.set('grant_type', 'authorization_code')
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('client_secret', clientSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  const tokenData = await tokenRes.json()

  if (!tokenData.access_token) {
    console.error('Naver token error:', tokenData)
    return NextResponse.redirect(new URL('/login?error=naver_failed', origin))
  }

  // 2. 네이버 사용자 정보 조회
  const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profileData = await profileRes.json()
  const naverUser = profileData.response

  if (!naverUser?.email) {
    return NextResponse.redirect(new URL('/login?error=naver_no_email', origin))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const callbackUrl = `${origin}/api/auth/callback?role=${role}&next=${next}`

  // 3. 매직링크 생성 시도 (사용자가 이미 존재하면 성공)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: naverUser.email,
    options: { redirectTo: callbackUrl },
  })

  if (!linkError && linkData?.properties?.action_link) {
    return NextResponse.redirect(linkData.properties.action_link)
  }

  // 4. 사용자 없으면 신규 생성 후 재시도
  const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
    email: naverUser.email,
    email_confirm: true,
    user_metadata: {
      full_name: naverUser.name ?? naverUser.nickname ?? '',
      provider: 'naver',
    },
  })

  if (createError || !newUserData.user) {
    console.error('Naver createUser error:', createError)
    return NextResponse.redirect(new URL('/login?error=naver_failed', origin))
  }

  // 프로필 role 설정
  await supabase.from('profiles').upsert({
    id: newUserData.user.id,
    role,
    name: naverUser.name ?? naverUser.nickname ?? '',
  })

  // 5. 신규 사용자 매직링크 재생성
  const { data: linkData2, error: linkError2 } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: naverUser.email,
    options: { redirectTo: callbackUrl },
  })

  if (linkError2 || !linkData2?.properties?.action_link) {
    console.error('Magic link error:', linkError2)
    return NextResponse.redirect(new URL('/login?error=naver_failed', origin))
  }

  return NextResponse.redirect(linkData2.properties.action_link)
}
