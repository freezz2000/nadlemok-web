'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: string
}

const navItems: Record<UserRole, NavItem[]> = {
  admin: [
    { href: '/admin', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/templates', label: '설문 템플릿', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/projects', label: '프로젝트', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { href: '/admin/clients', label: '고객 관리', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { href: '/admin/panels', label: '패널 관리', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/admin/matching', label: '패널 매칭', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { href: '/admin/inquiries', label: '문의내역', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { href: '/admin/notifications', label: '알림 설정', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  ],
  client: [
    { href: '/client', label: '대시보드', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/client/apply', label: '새 프로젝트', icon: 'M12 4v16m8-8H4' },
    { href: '/client/projects', label: '내 프로젝트', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { href: '/client/panels', label: '내 패널', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { href: '/client/subscription', label: '크레딧 충전', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { href: '/client/profile', label: '내 프로필', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
  panel: [
    { href: '/panel', label: '홈', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/panel/profile', label: '내 프로필', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ],
}

const roleLabels: Record<UserRole, string> = {
  admin: '관리자',
  client: '고객',
  panel: '패널',
}

interface SidebarProps {
  role: UserRole
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ role, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems[role]
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    if (role !== 'client') return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('client_credits')
        .select('balance')
        .eq('client_id', user.id)
        .single()
        .then(({ data }) => setCreditBalance(data?.balance ?? 0))
    })
  }, [role])

  return (
    <aside className={`w-64 h-screen bg-navy text-white flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gold">나들목</span>
          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">{roleLabels[role]}</span>
        </Link>
        {/* 모바일 닫기 버튼 */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="메뉴 닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== `/${role}` && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${isActive
                  ? 'bg-white/15 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* 크레딧 잔액 (client 전용) */}
      {role === 'client' && (
        <div className="px-3 pb-2">
          <Link
            href="/client/subscription"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs text-white/70">크레딧 잔액</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gold">
                {creditBalance !== null ? creditBalance : '—'}
              </span>
              <span className="text-xs text-white/50">cr</span>
              <span className="text-xs text-white/40 ml-0.5">충전 →</span>
            </div>
          </Link>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10 text-xs text-white/40">
        나들목 v0.1
      </div>
    </aside>
  )
}
