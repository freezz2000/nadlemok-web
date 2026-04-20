'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CreditSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [credits, setCredits] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handle() {
      const paymentKey = searchParams.get('paymentKey')
      const orderId = searchParams.get('orderId')
      const amount = Number(searchParams.get('amount'))
      const creditsParam = Number(searchParams.get('credits'))
      // returnTo 검증: 내부 경로(/)만 허용 (Open Redirect 방지)
      const rawReturnTo = searchParams.get('returnTo')
      const returnTo = rawReturnTo?.startsWith('/') ? rawReturnTo : '/client/subscription'

      if (!paymentKey || !orderId || !amount || !creditsParam) {
        setErrorMsg('결제 정보가 올바르지 않습니다.')
        setStatus('error')
        return
      }

      const res = await fetch('/api/payment/credit-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentKey, orderId, amount, credits: creditsParam }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || '크레딧 충전 중 오류가 발생했습니다.')
        setStatus('error')
        return
      }

      setCredits(data.credits)
      setRemaining(data.remaining)
      setStatus('success')

      setTimeout(() => router.push(returnTo), 3000)
    }

    handle()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">크레딧 충전 중입니다...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">✕</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">충전 실패</h1>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/client/subscription')}
            className="px-6 py-2.5 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-go/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-go" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">충전 완료!</h1>
        <p className="text-3xl font-black text-navy my-4">
          +{credits}<span className="text-base font-normal text-gray-500 ml-1">cr</span>
        </p>
        <p className="text-sm text-gray-500 mb-1">
          현재 잔액 <span className="font-semibold text-navy">{remaining}cr</span>
        </p>
        <p className="text-xs text-gray-400 mt-4">잠시 후 이전 페이지로 이동합니다...</p>
      </div>
    </div>
  )
}

export default function CreditSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreditSuccessContent />
    </Suspense>
  )
}
