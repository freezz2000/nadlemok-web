'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function FailContent() {
  const params = useSearchParams()
  const code    = params.get('code')
  const message = params.get('message')

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-nogo-bg rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-nogo" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-text mb-2">결제에 실패했습니다</h2>
      {message && (
        <p className="text-sm text-text-muted mb-1">{message}</p>
      )}
      {code && (
        <p className="text-xs text-text-muted/60 mb-6">오류 코드: {code}</p>
      )}
      <div className="flex flex-col gap-3 mt-4">
        <Link
          href="/client/apply"
          className="block w-full py-2.5 rounded-lg bg-navy text-white text-sm font-medium text-center hover:bg-navy/90 transition-colors"
        >
          다시 신청하기
        </Link>
        <Link
          href="/client"
          className="block w-full py-2.5 rounded-lg border border-border text-sm text-text text-center hover:bg-surface transition-colors"
        >
          대시보드로 돌아가기
        </Link>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="bg-white rounded-2xl border border-border shadow-sm p-10 w-full max-w-md">
        <Suspense fallback={<div className="h-40" />}>
          <FailContent />
        </Suspense>
      </div>
    </div>
  )
}
