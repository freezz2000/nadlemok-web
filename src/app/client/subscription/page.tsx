'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Link from 'next/link'

declare global {
  interface Window {
    TossPayments: (clientKey: string) => {
      payment: (options: { customerKey: string }) => {
        requestBillingAuth: (options: {
          method: string
          successUrl: string
          failUrl: string
          customerEmail?: string
          customerName?: string
        }) => Promise<void>
      }
    }
  }
}

const PLANS = [
  {
    key: 'starter' as const,
    name: 'Starter',
    price: 29000,
    credits: 100,
    priceLabel: '29,000원/월',
    description: 'Standard 10회 또는 Premium 3회 열람',
    items: ['Standard 분석 열람 × 10회', 'Premium 분석 열람 × 3회', '크레딧 이월 없음 (매월 리셋)'],
    color: 'border-navy/20 hover:border-navy/40',
    badge: null,
  },
  {
    key: 'growth' as const,
    name: 'Growth',
    price: 49000,
    credits: 300,
    priceLabel: '49,000원/월',
    description: 'Standard 30회 또는 Premium 10회 열람',
    items: ['Standard 분석 열람 × 30회', 'Premium 분석 열람 × 10회', '크레딧 이월 없음 (매월 리셋)'],
    color: 'border-gold/40 hover:border-gold',
    badge: '인기',
  },
]

interface Subscription {
  id: string
  plan: string
  status: string
  current_period_start: string
  current_period_end: string
}

interface Credits {
  balance: number
}

export default function SubscriptionPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [credits, setCredits] = useState<Credits | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth'>('starter')
  const [agreed, setAgreed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const tossRef = useRef<boolean>(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: sub }, { data: cr }] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, plan, status, current_period_start, current_period_end')
          .eq('client_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('client_credits')
          .select('balance')
          .eq('client_id', user.id)
          .single(),
      ])

      setSubscription(sub)
      setCredits(cr)
      setLoading(false)
    }
    load()
  }, [supabase])

  // TossPayments SDK 동적 로드
  useEffect(() => {
    if (tossRef.current) return
    tossRef.current = true
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment'
    script.async = true
    document.head.appendChild(script)
  }, [])

  async function handleSubscribe() {
    if (!userId || !agreed) return
    setSubscribing(true)

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
      const customerKey = `nadlemok-client-${userId}`

      const toss = window.TossPayments(clientKey)
      const payment = toss.payment({ customerKey })

      const baseUrl = window.location.origin
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${baseUrl}/client/subscription/billing-success?plan=${selectedPlan}&clientId=${userId}`,
        failUrl: `${baseUrl}/client/subscription/billing-fail`,
        customerName: undefined,
      })
    } catch (err) {
      console.error('billing auth error:', err)
      setSubscribing(false)
    }
  }

  async function handleCancel() {
    if (!subscription) return
    const confirmed = window.confirm('구독을 해지하시겠습니까?\n당월 말까지 서비스는 계속 이용 가능합니다.')
    if (!confirmed) return

    setCanceling(true)
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('id', subscription.id)

    setSubscription(null)
    setCanceling(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const planConfig = PLANS.find((p) => p.key === subscription?.plan)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">크레딧 구독</h1>
        <p className="text-sm text-text-muted mt-1">매월 크레딧을 충전하여 분석 결과를 열람하세요</p>
      </div>

      {/* 현재 크레딧 잔액 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide">크레딧 잔액</p>
            <p className="text-3xl font-bold text-navy mt-1">
              {credits?.balance ?? 0}
              <span className="text-base font-normal text-text-muted ml-1">cr</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Standard 열람 = 10cr</p>
            <p className="text-xs text-text-muted">Premium 열람 = 30cr</p>
          </div>
        </div>
      </Card>

      {/* 활성 구독 */}
      {subscription && planConfig && (
        <Card className="mb-6 border border-navy/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wide">현재 구독 플랜</p>
              <p className="text-xl font-bold text-text mt-1">{planConfig.name}</p>
              <p className="text-sm text-text-muted">{planConfig.priceLabel} · {planConfig.credits}크레딧/월</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 bg-go-bg text-go text-xs font-medium rounded-full">구독중</span>
              <p className="text-xs text-text-muted mt-2">
                다음 결제: {new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleCancel}
              disabled={canceling}
              className="text-sm text-text-muted hover:text-nogo transition-colors"
            >
              {canceling ? '처리 중...' : '구독 해지'}
            </button>
            <p className="text-xs text-text-muted mt-1">해지 시 당월 말까지 서비스는 계속 이용 가능합니다</p>
          </div>
        </Card>
      )}

      {/* 플랜 선택 (구독 없을 때) */}
      {!subscription && (
        <>
          <CardTitle className="mb-4">플랜 선택</CardTitle>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {PLANS.map((plan) => (
              <button
                key={plan.key}
                onClick={() => setSelectedPlan(plan.key)}
                className={`relative text-left p-5 rounded-xl border-2 transition-all ${plan.color} ${
                  selectedPlan === plan.key
                    ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                    : 'bg-white'
                }`}
              >
                {plan.badge && (
                  <span className="absolute top-3 right-3 text-xs font-medium px-2 py-0.5 bg-gold text-white rounded-full">
                    {plan.badge}
                  </span>
                )}
                <p className="font-bold text-text text-lg">{plan.name}</p>
                <p className="text-navy font-semibold mt-1">{plan.priceLabel}</p>
                <p className="text-xs text-text-muted mt-1">{plan.credits}크레딧/월</p>
                <ul className="mt-3 space-y-1">
                  {plan.items.map((item, i) => (
                    <li key={i} className="text-xs text-text-muted flex items-start gap-1.5">
                      <span className="text-go mt-0.5">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          {/* 약관 동의 */}
          <div className="flex items-start gap-2.5 p-3.5 bg-gray-50 rounded-xl mb-4">
            <input
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-navy cursor-pointer"
            />
            <label htmlFor="terms" className="text-xs text-gray-600 leading-relaxed cursor-pointer">
              <span className="font-medium text-gray-800">[필수]</span>{' '}
              <Link href="/terms/service" className="text-navy underline" target="_blank">이용약관</Link>
              {' '}및{' '}
              <Link href="/terms/refund" className="text-navy underline" target="_blank">환불정책</Link>
              에 동의합니다.
              <span className="block text-gray-400 mt-0.5">
                구독은 매월 자동 갱신되며, 미사용 크레딧은 이월되지 않습니다.
              </span>
            </label>
          </div>

          <Button
            onClick={handleSubscribe}
            loading={subscribing}
            disabled={!agreed}
            className="w-full"
            size="lg"
          >
            {PLANS.find((p) => p.key === selectedPlan)?.priceLabel} 구독 시작
          </Button>

          <p className="text-xs text-text-muted text-center mt-3">
            카드를 등록하면 즉시 첫 달 결제 후 크레딧이 충전됩니다
          </p>
        </>
      )}
    </div>
  )
}
