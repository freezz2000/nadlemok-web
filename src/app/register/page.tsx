'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import type { UserRole } from '@/lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('panel')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          company: role === 'client' ? company : null,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // 프로필은 DB 트리거가 자동 생성함
      // 트리거가 아직 처리 안 됐을 수 있으므로 약간 대기 후 이동
      await new Promise((r) => setTimeout(r, 500))

      // 풀 리로드로 이동해야 미들웨어가 세션 쿠키를 인식함
      if (role === 'panel') {
        window.location.href = '/register/panel'
      } else if (role === 'client') {
        window.location.href = '/register/client'
      } else {
        window.location.href = '/admin'
      }
    }
  }

  const roles: { value: UserRole; label: string; desc: string }[] = [
    { value: 'panel', label: '패널', desc: '제품을 직접 사용하고 평가합니다' },
    { value: 'client', label: '고객 (브랜드사)', desc: '신제품 검증을 의뢰합니다' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface py-12 relative">
      <Link href="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-text-muted hover:text-navy transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        홈으로
      </Link>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-navy">나들목</Link>
          <p className="text-text-muted mt-2">회원가입</p>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm p-8">
          <div className="space-y-4 mb-6">
            {/* 역할 선택 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">가입 유형</label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      role === r.value
                        ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    <div className="text-sm font-medium text-text">{r.label}</div>
                    <div className="text-xs text-text-muted mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 소셜 가입 */}
            <div className="space-y-2">
              {/* 네이버 버튼 임시 숨김
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/api/auth/naver?role=${role}&next=${role === 'panel' ? '/register/panel' : '/client'}`
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#03C75A' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" fill="white"/>
                </svg>
                네이버로 가입하기
              </button>
              */}

              <button
                type="button"
                onClick={async () => {
                  const nextUrl = role === 'panel' ? '/register/panel' : '/client'
                  await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                      redirectTo: `${window.location.origin}/api/auth/callback?next=${nextUrl}&role=${role}`,
                    },
                  })
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: '#FEE500', color: '#3C1E1E' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#3C1E1E" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.44 5.07 3.63 6.57l-.93 3.45 3.97-2.64c1.04.24 2.14.37 3.33.37 5.52 0 10-3.48 10-7.75S17.52 3 12 3z"/>
                </svg>
                카카오로 가입하기
              </button>

              <button
                type="button"
                onClick={async () => {
                  const nextUrl = role === 'panel' ? '/register/panel' : '/client'
                  await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/api/auth/callback?next=${nextUrl}&role=${role}`,
                      queryParams: { access_type: 'offline', prompt: 'consent' },
                    },
                  })
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-text hover:bg-surface transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google로 가입하기
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-text-muted">또는 이메일로 가입</span>
            </div>
          </div>

          {!showEmailForm && (
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-text hover:border-navy/40 hover:text-navy transition-colors"
            >
              이메일로 가입
            </button>
          )}

          {showEmailForm && (
            <form onSubmit={handleRegister} className="space-y-4">
              {role === 'client' && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">회사명</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="회사명을 입력하세요"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="6자 이상 입력하세요"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">비밀번호 확인</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy ${
                    confirmPassword && confirmPassword !== password ? 'border-nogo' : 'border-border'
                  }`}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-nogo mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>

              {error && <p className="text-sm text-nogo">{error}</p>}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                가입하기
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-text-muted">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-navy font-medium hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
