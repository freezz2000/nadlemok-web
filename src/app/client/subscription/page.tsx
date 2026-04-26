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

  // 배송 대행 선결제 파라미터
  const rawProjectId = searchParams.get('projectId')
  const deliveryPanelCount = Number(searchParams.get('deliveryPanelCount') ?? '0')
  const deliveryFee = deliveryPanelCount > 0 ? deliveryPanelCount * 10_000 : 0

  // 결제 내역 / 환불
  interface PaymentRecord {
    id: string
    order_id: string
    payment_key: string | null
    amount: number
    status: 'DONE' | 'CANCELED' | 'FAILED'
    paid_at: string | null
    created_at: string
  }
  const AMOUNT_TO_CREDITS: Record<number, number> = { 500000: 30, 800000: 50 }
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundMsg, setRefundMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: cr }, { data: payData }] = await Promise.all([
        supabase
          .from('client_credits')
          .select('balance')
          .eq('client_id', user.id)
          .single(),
        supabase
          .from('payments')
          .select('id, order_id, payment_key, amount, status, paid_at, created_at')
          .eq('user_id', user.id)
          .eq('payment_context', 'credit_charge')
          .order('created_at', { ascending: false }),
      ])
      setCreditBalance(cr?.balance ?? 0)
      setPayments((payData as PaymentRecord[]) || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  async function handleRefund(paymentId: string, credits: number, amount: number) {
    if (!confirm(`${amount.toLocaleString()}원 (${credits}cr) 결제를 환불 신청하시겠습니까?\n\n환불 처리 후 크레딧이 즉시 차감됩니다.`)) return
    setRefundingId(paymentId)
    setRefundMsg(null)
    try {
      const res = await fetch('/api/credits/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRefundMsg({ type: 'error', text: data.error || '환불 처리에 실패했습니다.' })
      } else {
        setRefundMsg({
          type: 'success',
          text: `환불이 완료되었습니다. ${data.refundedAmount.toLocaleString()}원이 카드사를 통해 환불됩니다. (3~5 영업일 소요)`,
        })
        setCreditBalance(data.newBalance)
        setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'CANCELED' } : p))
      }
    } catch {
      setRefundMsg({ type: 'error', text: '서버 오류가 발생했습니다. 다시 시도해주세요.' })
    } finally {
      setRefundingId(null)
    }
  }

  async function handlePay() {
    if (!userId) return
    setPaying(true)

    const pkg = CREDIT_PACKAGES.find(p => p.credits === selectedPkg)!
    const totalAmount = pkg.price + deliveryFee
    const orderId = `nadlemok-credit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!
    const customerKey = `nc-${userId}`

    try {
      const tossPayments = await loadTossPayments(clientKey)
      const payment = tossPayments.payment({ customerKey })
      const baseUrl = window.location.origin
      let successUrl = `${baseUrl}/client/subscription/credit-success?credits=${pkg.credits}&returnTo=${encodeURIComponent(returnTo || '/client/subscription')}`
      if (deliveryFee > 0 && rawProjectId) {
        successUrl += `&deliveryFee=${deliveryFee}&projectId=${rawProjectId}`
      }
      const orderName = deliveryFee > 0
        ? `나들목 크레딧 ${pkg.credits}개 + 배송 대행료 (${deliveryPanelCount}명)`
        : `나들목 크레딧 ${pkg.credits}개 (외부 패널 ${pkg.credits}명 검증)`
      await payment.requestPayment({
        method: 'CARD',
        amount: { value: totalAmount, currency: 'KRW' },
        orderId,
        orderName,
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
        {deliveryFee > 0 && (
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-muted">
              샘플 배송 대행료
              <span className="ml-1 text-xs text-text-muted/70">({deliveryPanelCount}명 × 10,000원)</span>
            </span>
            <span className="font-medium text-amber-600">{deliveryFee.toLocaleString('ko-KR')}원</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-2 mt-1 border-t border-border">
          <span className="font-semibold text-text">결제 금액</span>
          <span className="font-bold text-navy text-base">
            {(pkg.price + deliveryFee).toLocaleString('ko-KR')}원
          </span>
        </div>
        <p className="text-xs text-text-muted mt-1.5">* VAT 별도</p>
      </div>

      <Button onClick={handlePay} loading={paying} className="w-full" size="lg">
        {(pkg.price + deliveryFee).toLocaleString('ko-KR')}원 결제하고 {pkg.credits}cr 충전
        {deliveryFee > 0 && ' + 배송 대행료'}
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

      {/* ── 결제 내역 / 환불 ───────────────────────────────── */}
      {payments.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-bold text-text mb-3">결제 내역</h2>

          {/* 환불 결과 메시지 */}
          {refundMsg && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
              refundMsg.type === 'error'
                ? 'bg-nogo-bg border-nogo/20 text-nogo'
                : 'bg-go-bg border-go/20 text-go'
            }`}>
              {refundMsg.text}
            </div>
          )}

          <div className="space-y-3">
            {payments.map((pay) => {
              const credits = AMOUNT_TO_CREDITS[pay.amount]
              const isRefunding = refundingId === pay.id
              // 잔액 기준 사용 여부 판단 (전액 잔여일 때만 환불 가능)
              const enoughBalance = credits !== undefined && (creditBalance ?? 0) >= credits
              const canRefund = pay.status === 'DONE' && !!pay.payment_key && enoughBalance

              return (
                <div
                  key={pay.id}
                  className={`rounded-xl border p-4 ${
                    pay.status === 'CANCELED' ? 'bg-surface border-border opacity-60' : 'bg-white border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-text">
                          {pay.amount.toLocaleString()}원
                        </span>
                        {credits !== undefined && (
                          <span className="text-xs font-medium text-navy bg-blue-50 px-2 py-0.5 rounded-full">
                            {credits}cr 충전
                          </span>
                        )}
                        {pay.status === 'DONE' && (
                          <span className="text-xs font-medium text-go bg-go-bg px-2 py-0.5 rounded-full">결제완료</span>
                        )}
                        {pay.status === 'CANCELED' && (
                          <span className="text-xs font-medium text-text-muted bg-surface border border-border px-2 py-0.5 rounded-full">환불완료</span>
                        )}
                        {pay.status === 'FAILED' && (
                          <span className="text-xs font-medium text-nogo bg-nogo-bg px-2 py-0.5 rounded-full">결제실패</span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-1.5">
                        {new Date(pay.paid_at || pay.created_at).toLocaleString('ko-KR', {
                          year: 'numeric', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {/* 크레딧 사용됨 경고 */}
                      {pay.status === 'DONE' && credits !== undefined && !enoughBalance && (
                        <p className="text-xs text-amber-600 mt-1">
                          크레딧이 사용되어 환불이 불가능합니다
                        </p>
                      )}
                    </div>

                    {/* 환불 버튼 */}
                    {pay.status === 'DONE' && (
                      <button
                        onClick={() => canRefund && credits && handleRefund(pay.id, credits, pay.amount)}
                        disabled={!canRefund || isRefunding}
                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          !canRefund
                            ? 'bg-surface text-text-muted border-border cursor-not-allowed'
                            : 'bg-white text-nogo border-nogo/30 hover:bg-nogo hover:text-white hover:border-nogo'
                        }`}
                      >
                        {isRefunding ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                            처리 중
                          </span>
                        ) : '환불 신청'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 환불 정책 안내 */}
          <div className="mt-4 p-4 bg-surface rounded-xl border border-border">
            <p className="text-xs font-semibold text-text mb-2">환불 정책</p>
            <ul className="space-y-1">
              <li className="text-xs text-text-muted">• 크레딧을 전혀 사용하지 않은 경우 전액 환불 가능합니다</li>
              <li className="text-xs text-text-muted">• 크레딧을 일부라도 사용한 경우 환불이 불가능합니다</li>
              <li className="text-xs text-text-muted">• 환불 완료 후 카드사 처리까지 3~5 영업일이 소요됩니다</li>
              <li className="text-xs text-text-muted">• 문의: <a href="mailto:official@linebreakers.co.kr" className="text-navy hover:underline">official@linebreakers.co.kr</a></li>
            </ul>
          </div>
        </div>
      )}
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
