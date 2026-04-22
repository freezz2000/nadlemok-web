'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

interface InvitationData {
  id: string
  token: string
  phone: string
  status: string
  expires_at: string
  project: { id: string; product_name: string; product_category: string }
  survey: { id: string; title: string } | null
}

export default function InviteTokenPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client') ?? undefined
  const supabase = createClient()

  const [step, setStep] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function init() {
      // 1. 토큰 검증
      const res = await fetch(`/api/invite/accept?token=${token}`)
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || '유효하지 않은 초대 링크입니다')
        setStep('error')
        return
      }

      const inv: InvitationData = data.invitation
      setInvitation(inv)

      // 2. 이미 로그인된 사용자 → 바로 수락
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setStep('accepting')
        await acceptInvitation(user.id, inv)
        return
      }

      // 3. 비로그인 → localStorage에 invite 정보 저장 후 회원가입으로 이동
      localStorage.setItem('pending_invite', JSON.stringify({ token, clientId }))
      setStep('ready')
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function acceptInvitation(panelId: string, inv: InvitationData) {
    const res = await fetch('/api/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, panelId, clientId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setErrorMsg(data.error || '초대 수락 처리 중 오류가 발생했습니다')
      setStep('error')
      return
    }

    setStep('done')
    setTimeout(() => {
      if (data.surveyId) {
        router.push(`/panel/surveys/${data.surveyId}`)
      } else {
        router.push('/panel/dashboard')
      }
    }, 1500)
  }

  function goToRegister() {
    router.push('/register?role=panel')
  }

  // ── 로딩 ────────────────────────────────────────────────
  if (step === 'loading' || step === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {step === 'accepting' ? '초대 수락 중...' : '초대 링크 확인 중...'}
          </p>
        </div>
      </div>
    )
  }

  // ── 오류 ────────────────────────────────────────────────
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

  // ── 완료 ────────────────────────────────────────────────
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

  // ── 회원가입 안내 (step === 'ready') ────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-sm w-full">
        {/* 초대 정보 카드 */}
        {invitation && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
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
              <span className="font-medium text-gray-800">{invitation.project.product_name}</span> 제품 테스트 패널로
              초대받으셨습니다. 아래 버튼을 눌러 패널 회원가입을 완료하면 설문에 참여할 수 있습니다.
            </p>
            {invitation.survey && (
              <div className="mt-3 px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  설문: <span className="font-medium text-gray-700">{invitation.survey.title}</span>
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            나들목 패널로 가입하고 제품 테스트에 참여하세요.<br />
            회원가입 완료 후 초대가 자동으로 수락됩니다.
          </p>
          <Button onClick={goToRegister} className="w-full">
            패널 회원가입 하기
          </Button>
          <p className="mt-3 text-xs text-gray-400">
            이미 계정이 있으신가요?{' '}
            <button
              onClick={() => router.push(`/login?next=/invite/${token}${clientId ? `?client=${clientId}` : ''}`)}
              className="text-navy underline"
            >
              로그인
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
