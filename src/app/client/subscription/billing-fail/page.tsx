'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function BillingFailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const message = searchParams.get('message') || '카드 등록이 취소되었습니다'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-xl">✕</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">카드 등록 실패</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
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

export default function BillingFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BillingFailContent />
    </Suspense>
  )
}
