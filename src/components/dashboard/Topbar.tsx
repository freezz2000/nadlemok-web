'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'
import Badge from '@/components/ui/Badge'

const roleLabels = {
  admin: '관리자',
  client: '고객',
  panel: '패널',
}

export default function Topbar({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 fixed top-0 left-64 right-0 z-30">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text">{profile.name}</span>
          <Badge variant="info">{roleLabels[profile.role]}</Badge>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-text-muted hover:text-text transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
