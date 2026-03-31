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

interface TopbarProps {
  profile: Profile
  onMenuClick?: () => void
}

export default function Topbar({ profile, onMenuClick }: TopbarProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 fixed top-0 left-0 lg:left-64 right-0 z-30">
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors"
        aria-label="메뉴 열기"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden lg:block" />
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
