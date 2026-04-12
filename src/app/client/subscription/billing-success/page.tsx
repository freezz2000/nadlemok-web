'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function BillingSuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handle() {
      const authKey = searchParams.get('authKey')
      const customerKey = searchParams.get('customerKey')
      const plan = searchParams.get('plan')
      const clientId = searchParams.get('clientId')

      if (!authKey || !customerKey || !plan || !clientId) {
        setErrorMsg('필수 파라미터가 누락되었습니다')
        setStatus('error')
        return
      }

      const res = await fetch('/api/billing/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authKey, customerKey, plan, clientId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || '구독 처리 중 오류가 발생했습니다')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => router.push('/client/subscription'), 2500)
    }

    handle()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">구독 처리 중입니다...</p>
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
          <h1 className="text-xl font-bold text-gray-900 mb-2">구독 처리 실패</h1>
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
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-green-600 text-xl">✓</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">구독이 시작되었습니다!</h1>
        <p className="text-sm text-gray-500">크레딧이 충전되었습니다. 구독 페이지로 이동합니다...</p>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BillingSuccessContent />
    </Suspense>
  )
}
