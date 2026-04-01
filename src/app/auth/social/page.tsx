'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SocialAuthHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const role = searchParams.get('role') ?? 'panel'

    async function handleRedirect(userId: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (!profile?.role) {
        await supabase.from('profiles').upsert({
          id: userId,
          role,
          name: '',
        })
      }

      const effectiveRole = profile?.role ?? role

      if (effectiveRole === 'panel') {
        const { data: panelProfile } = await supabase
          .from('panel_profiles')
          .select('id, skin_type')
          .eq('id', userId)
          .single()

        router.push(panelProfile?.skin_type ? '/panel' : '/register/panel')
      } else if (effectiveRole === 'client') {
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('terms_agreed_at, contact_phone')
          .eq('id', userId)
          .single()

        const isClientComplete = clientProfile?.terms_agreed_at && clientProfile?.contact_phone
        router.push(isClientComplete ? '/client' : '/register/client')
      } else {
        router.push('/')
      }
    }

    async function init() {
      // 1. URL hash에 access_token이 있으면 (implicit flow - Supabase magic link)
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token') ?? ''

        if (access_token) {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error && data.user) {
            await handleRedirect(data.user.id)
            return
          }
        }
      }

      // 2. 이미 로그인된 세션이 있으면 바로 처리
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await handleRedirect(user.id)
        return
      }

      // 3. 모두 실패하면 로그인 페이지로
      router.push('/login?error=oauth')
    }

    init()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-text-muted">로그인 처리 중...</p>
      </div>
    </div>
  )
}

export default function SocialAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">로그인 처리 중...</p>
        </div>
      </div>
    }>
      <SocialAuthHandler />
    </Suspense>
  )
}
