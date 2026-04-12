'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface InvitationData {
  id: string
  token: string
  email: string
  status: string
  expires_at: string
  project: { id: string; product_name: string; product_category: string }
  survey: { id: string; title: string } | null
}

export default function InviteTokenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'loading' | 'info' | 'auth' | 'done' | 'error'>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 회원가입 폼
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup')
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    async function validateToken() {
      const res = await fetch(`/api/invite/accept?token=${token}`)
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || '유효하지 않은 초대 링크입니다')
        setStep('error')
        return
      }

      setInvitation(data.invitation)

      // 이미 로그인된 경우 바로 수락 처리
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await acceptInvitation(user.id, data.invitation)
        return
      }

      // 이메일 필드 prefill
      if (data.invitation.email) {
        setEmail(data.invitation.email)
      }
      setStep('info')
    }

    validateToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function acceptInvitation(panelId: string, inv?: InvitationData) {
    const inv_ = inv || invitation
    if (!inv_) return

    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, panelId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data.error || '초대 수락 처리 중 오류가 발생했습니다')
      setStep('error')
      return
    }

    setStep('done')
    // 잠시 후 설문 이동
    setTimeout(() => {
      if (data.surveyId) {
        router.push(`/panel/surveys/${data.surveyId}`)
      } else {
        router.push('/panel/dashboard')
      }
    }, 2000)
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setAuthError('')

    try {
      if (authMode === 'signup') {
        const { data: authData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role: 'panel', full_name: name },
          },
        })
        if (error) throw error

        const userId = authData.user?.id
        if (!userId) throw new Error('가입 처리 중 오류가 발생했습니다')

        // 패널 프로필 기본 생성
        await supabase.from('panel_profiles').upsert({
          id: userId,
          full_name: name,
          panel_type: 'invited',
          terms_agreed_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false })

        // profiles 역할 설정
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          role: 'panel',
        }, { onConflict: 'id', ignoreDuplicates: false })

        await acceptInvitation(userId)
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        const userId = authData.user?.id
        if (!userId) throw new Error('로그인 처리 중 오류가 발생했습니다')

        await acceptInvitation(userId)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다'
      setAuthError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">초대 링크 확인 중...</p>
        </div>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">초대 링크 오류</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <Button onClick={() => router.push('/')} variant="secondary" size="sm">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">초대 수락 완료!</h1>
          <p className="text-gray-500 text-sm">설문 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  // step === 'info' or 'auth'
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* 초대 정보 카드 */}
        {invitation && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center flex-shrink-0">
                <span className="text-navy text-lg">💌</span>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">제품 테스트 초대</p>
                <h1 className="text-lg font-bold text-gray-900">{invitation.project.product_name}</h1>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-medium text-gray-800">{invitation.project.product_name}</span> 제품 테스트 패널로 초대받으셨습니다.
              아래에서 간편하게 참여하고 설문에 응답해주세요.
            </p>
            {invitation.survey && (
              <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">설문: <span className="font-medium text-gray-700">{invitation.survey.title}</span></p>
              </div>
            )}
          </div>
        )}

        {/* 인증 폼 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* 탭 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setAuthMode('signup'); setAuthError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                authMode === 'signup'
                  ? 'bg-navy text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              처음 참여하기
            </button>
            <button
              onClick={() => { setAuthMode('login'); setAuthError('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                authMode === 'login'
                  ? 'bg-navy text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              기존 계정으로 참여
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="홍길동"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={authMode === 'signup' ? '6자리 이상' : '비밀번호 입력'}
                minLength={authMode === 'signup' ? 6 : undefined}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors"
              />
            </div>

            {authError && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{authError}</p>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              {authMode === 'signup' ? '참여하기' : '로그인 후 참여하기'}
            </Button>
          </form>

          {authMode === 'signup' && (
            <p className="mt-4 text-xs text-gray-400 text-center leading-relaxed">
              참여 시 나들목의{' '}
              <a href="/terms/service" className="text-navy underline" target="_blank" rel="noopener noreferrer">이용약관</a>
              {' '}및{' '}
              <a href="/terms/privacy" className="text-navy underline" target="_blank" rel="noopener noreferrer">개인정보처리방침</a>
              에 동의하는 것으로 간주됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
