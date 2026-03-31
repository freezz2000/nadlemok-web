import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const role = searchParams.get('role') ?? 'panel'
  const next = searchParams.get('next') ?? (role === 'panel' ? '/register/panel' : '/client')

  const clientId = process.env.NAVER_CLIENT_ID
  if (!clientId || clientId === 'your_naver_client_id') {
    return NextResponse.redirect(new URL('/login?error=naver_not_configured', origin))
  }

  const state = Buffer.from(JSON.stringify({ role, next })).toString('base64url')
  const redirectUri = `${origin}/api/auth/naver/callback`

  const naverUrl = new URL('https://nid.naver.com/oauth2.0/authorize')
  naverUrl.searchParams.set('response_type', 'code')
  naverUrl.searchParams.set('client_id', clientId)
  naverUrl.searchParams.set('redirect_uri', redirectUri)
  naverUrl.searchParams.set('state', state)

  return NextResponse.redirect(naverUrl.toString())
}
