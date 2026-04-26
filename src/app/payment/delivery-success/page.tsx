'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function DeliverySuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    const paymentKey = params.get('paymentKey')
    const orderId    = params.get('orderId')
    const amount     = params.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      setStatus('error')
      return
    }

    // localStorage에서 projectId, surveyId 복원
    const raw = localStorage.getItem('pending_delivery_payment')
    if (!raw) {
      setErrorMsg('결제 정보를 찾을 수 없습니다. 다시 시도해주세요.')
      setStatus('error')
      return
    }

    let parsed: { projectId: string; surveyId: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      setErrorMsg('결제 정보 파싱에 실패했습니다.')
      setStatus('error')
      return
    }

    setProjectId(parsed.projectId)

    fetch('/api/payment/delivery-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
        projectId: parsed.projectId,
        surveyId: parsed.surveyId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          localStorage.removeItem('pending_delivery_payment')
          setStatus('done')
          setTimeout(() => router.push(`/client/projects/${parsed.projectId}`), 2000)
        } else {
          setErrorMsg(data.error ?? '결제 승인에 실패했습니다.')
          setStatus('error')
        }
      })
      .catch(() => {
        setErrorMsg('네트워크 오류가 발생했습니다.')
        setStatus('error')
      })
  }, [params, router])

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text font-medium">결제를 처리하고 있습니다...</p>
        <p className="text-sm text-text-muted mt-1">잠시만 기다려주세요.</p>
      </div>
    )
  }

  if (status === 'done') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-go-bg rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-go" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text mb-2">결제 완료! 설문이 시작됩니다</h2>
        <p className="text-sm text-text-muted mb-4">배송 대행료 결제가 완료되었습니다. 잠시 후 프로젝트 페이지로 이동합니다.</p>
        <Link href={`/client/projects/${projectId}`} className="text-navy text-sm hover:underline">
          바로 이동하기 →
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-nogo-bg rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-nogo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text mb-2">결제 처리 실패</h2>
      <p className="text-sm text-nogo mb-4">{errorMsg}</p>
      <Link href={projectId ? `/client/projects/${projectId}/invite` : '/client/projects'} className="text-navy text-sm hover:underline">
        돌아가기 →
      </Link>
    </div>
  )
}

export default function DeliverySuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-10 w-full max-w-md">
        <Suspense fallback={
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mx-auto" />
          </div>
        }>
          <DeliverySuccessContent />
        </Suspense>
      </div>
    </div>
  )
}
