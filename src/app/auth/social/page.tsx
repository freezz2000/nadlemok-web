'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SocialAuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const role = searchParams.get('role') ?? 'panel'

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return
      subscription.unsubscribe()

      const user = session.user

      // 프로필 role 없으면 설정
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile?.role) {
        await supabase.from('profiles').upsert({
          id: user.id,
          role,
          name: user.user_metadata?.full_name ?? '',
        })
      }

      const effectiveRole = profile?.role ?? role

      if (effectiveRole === 'panel') {
        const { data: panelProfile } = await supabase
          .from('panel_profiles')
          .select('id, skin_type')
          .eq('id', user.id)
          .single()

        router.push(panelProfile?.skin_type ? '/panel' : '/register/panel')
      } else if (effectiveRole === 'client') {
        router.push('/client')
      } else {
        router.push('/')
      }
    })

    // 3초 내 SIGNED_IN 없으면 실패 처리
    const timer = setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login?error=oauth')
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
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
