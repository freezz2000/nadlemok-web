'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Suspense } from 'react'
import { loadTossPayments } from '@tosspayments/tosspayments-sdk'

const CREDIT_PACKAGES = [
  {
    credits: 30,
    price: 500000,
    priceLabel: '500,000원',
    perPerson: '16,667원/인',
    label: '소규모 검증',
    desc: '외부 패널 30명 1회 검증',
    badge: null,
  },
  {
    credits: 50,
    price: 800000,
    priceLabel: '800,000원',
    perPerson: '16,000원/인',
    label: '표준 검증',
    desc: '외부 패널 50명 1회 검증',
    badge: '추천',
  },
]

function SubscriptionContent() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  // returnTo 검증: 내부 경로(/)만 허용 (Open Redirect 방지)
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo = rawReturnTo?.startsWith('/') ? rawReturnTo : null

  const [userId, setUserId] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState<number>(50) // credits
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: cr } = await supabase
        .from('client_credits')
        .select('balance')
        .eq('client_id', user.id)
        .single()
      setCreditBalance(cr?.balance ?? 0)
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handlePay() {
    if (!userId) return
    setPaying(true)

    const pkg = CREDIT_PACKAGES.find(p => p.credits === selectedPkg)!
    const orderId = `nadlemok-credit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
    const customerKey = `nc-${userId}` // "nc-" + UUID(36자) = 39자, 50자 이하

    try {
      const tossPayments = await loadTossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey })
      const baseUrl = window.location.origin
      const successUrl = `${baseUrl}/client/subscription/credit-success?credits=${pkg.credits}&returnTo=${encodeURIComponent(returnTo || '/client/subscription')}`
      await payment.requestPayment({
        method: 'CARD',
        amount: { value: pkg.price, currency: 'KRW' },
        orderId,
        orderName: `나들목 크레딧 ${pkg.credits}개 (외부 패널 ${pkg.credits}명 검증)`,
        successUrl,
        failUrl: `${baseUrl}/client/subscription/billing-fail`,
      })
    } catch (err) {
      console.error('payment error:', err)
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pkg = CREDIT_PACKAGES.find(p => p.credits === selectedPkg)!

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">크레딧 충전</h1>
        <p className="text-sm text-text-muted mt-1">외부 패널 검증에 사용할 크레딧을 구매하세요</p>
      </div>

      {/* 현재 크레딧 잔액 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide">현재 크레딧 잔액</p>
            <p className="text-3xl font-bold text-navy mt-1">
              {creditBalance ?? 0}
              <span className="text-base font-normal text-text-muted ml-1">cr</span>
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-text-muted">외부패널 30명 = 30cr</p>
            <p className="text-xs text-text-muted">외부패널 50명 = 50cr</p>
          </div>
        </div>
      </Card>

      {/* 크레딧 패키지 선택 */}
      <p className="text-sm font-semibold text-text mb-3">패키지 선택</p>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {CREDIT_PACKAGES.map((p) => (
          <button
            key={p.credits}
            onClick={() => setSelectedPkg(p.credits)}
            className={`relative text-left p-5 rounded-xl border-2 transition-all ${
              selectedPkg === p.credits
                ? 'border-go bg-go/5 shadow-sm'
                : 'border-border bg-white hover:border-go/30'
            }`}
          >
            {p.badge && (
              <span className="absolute -top-2.5 right-3 text-xs px-2.5 py-0.5 bg-gold text-navy font-bold rounded-full shadow-sm">
                {p.badge}
              </span>
            )}

            {/* 라디오 인디케이터 */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                selectedPkg === p.credits ? 'bg-go/10 text-go' : 'bg-surface text-text-muted'
              }`}>{p.label}</span>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                selectedPkg === p.credits ? 'border-go' : 'border-border'
              }`}>
                {selectedPkg === p.credits && <div className="w-2 h-2 rounded-full bg-go" />}
              </div>
            </div>

            <p className={`text-2xl font-black mb-0.5 ${selectedPkg === p.credits ? 'text-go' : 'text-text'}`}>
              {p.priceLabel}
            </p>
            <p className="text-xs text-text-muted mb-3">{p.perPerson}</p>
            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
              selectedPkg === p.credits ? 'bg-go/10 text-go' : 'bg-surface text-text-muted'
            }`}>
              {p.credits}크레딧
            </div>
            <p className="text-xs text-text-muted mt-2">{p.desc}</p>
          </button>
        ))}
      </div>

      {/* 결제 요약 */}
      <div className="bg-surface rounded-xl border border-border p-4 mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-muted">선택 패키지</span>
          <span className="font-medium">{pkg.desc}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-muted">충전 크레딧</span>
          <span className="font-medium">{pkg.credits}cr</span>
        </div>
        <div className="flex justify-between text-sm pt-2 mt-1 border-t border-border">
          <span className="font-semibold text-text">결제 금액</span>
          <span className="font-bold text-navy text-base">{pkg.priceLabel}</span>
        </div>
        <p className="text-xs text-text-muted mt-1.5">* VAT 별도</p>
      </div>

      <Button onClick={handlePay} loading={paying} className="w-full" size="lg">
        {pkg.priceLabel} 결제하고 {pkg.credits}cr 충전
      </Button>

      {returnTo && (
        <button
          onClick={() => router.push(returnTo)}
          className="w-full mt-3 text-sm text-text-muted hover:text-text transition-colors"
        >
          ← 돌아가기
        </button>
      )}

      <p className="text-xs text-text-muted text-center mt-3">
        결제 즉시 크레딧이 충전되며, 패널 검증에 사용할 수 있습니다
      </p>
    </div>
  )
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SubscriptionContent />
    </Suspense>
  )
}
