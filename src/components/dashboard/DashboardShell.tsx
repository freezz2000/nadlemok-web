'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { UserRole } from '@/lib/types'
import type { Profile } from '@/lib/types'

interface DashboardShellProps {
  role: UserRole
  profile: Profile
  children: React.ReactNode
}

export default function DashboardShell({ role, profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // 라우트 변경 시 사이드바 닫기
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="min-h-screen bg-surface">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar role={role} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar profile={profile} onMenuClick={() => setSidebarOpen((v) => !v)} />
      <main className="lg:ml-64 mt-16 p-4 lg:p-6">
        {children}
      </main>
    </div>
  )
}
