'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * 패널 레이아웃에 포함되는 Client Component.
 * 마운트 시 localStorage의 'pending_invite_project' 키를 확인하여
 * 프로젝트 초대 수락 API를 호출한다.
 *
 * 기존 패널 사용자가 /invite/p/[token] 방문 후 소셜 로그인을 거쳐
 * /panel로 바로 이동할 경우, /register/panel을 거치지 않으므로
 * pending_invite_project가 미처리되는 버그를 방지한다.
 */
export default function PendingInviteProcessor() {
  const supabase = createClient()

  useEffect(() => {
    async function processPending() {
      const raw = localStorage.getItem('pending_invite_project')
      if (!raw) return

      try {
        const { projectToken, clientId } = JSON.parse(raw) as {
          projectToken: string
          clientId?: string
        }

        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // 이중 처리 방지 — API 호출 전에 먼저 제거
        localStorage.removeItem('pending_invite_project')

        await fetch('/api/invite/accept-project', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectToken, panelId: user.id, clientId }),
        })
      } catch {
        // 무시 — 패널 UX를 방해하지 않음
      }
    }

    processPending()
    // supabase 인스턴스는 렌더마다 안정적이므로 의존성 배열 생략
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
