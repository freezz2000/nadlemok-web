'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'
import type { ServicePlan } from '@/lib/types'

const PLAN_AMOUNT: Record<ServicePlan, number> = {
  basic: 2_000_000,
  standard: 3_000_000,
  premium: 5_000_000,
}

export default function ServiceApplyPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'TRANSFER'>('CARD')
  const [receiptType, setReceiptType] = useState<'세금계산서' | '현금영수증'>('세금계산서')
  const [businessNumber, setBusinessNumber] = useState('')
  const [taxEmail, setTaxEmail] = useState('')
  const [form, setForm] = useState({
    product_name: '',
    product_category: '화장품',
    product_line: '',
    plan: 'standard' as ServicePlan,
    notes: '',
  })

  const plans: { value: ServicePlan; name: string; price: string; detail: string }[] = [
    { value: 'basic',    name: 'Basic',    price: '200만원', detail: '50명 / 10일 / 3단계 분석' },
    { value: 'standard', name: 'Standard', price: '300만원', detail: '50명 / 10일 / 5단계 분석' },
    { value: 'premium',  name: 'Premium',  price: '500만원', detail: '100명 / 15일 / 9단계 분석' },
  ]

  // 마운트 시 고객 프로필에서 사업자번호 자동 로드
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('client_profiles')
        .select('business_number, tax_email')
        .eq('id', user.id)
        .single()
      if (data?.business_number) setBusinessNumber(data.business_number)
      if (data?.tax_email) setTaxEmail(data.tax_email)
    }
    loadProfile()
  }, [])

  // 제품군 필수 여부 (선택지가 있는 카테고리인 경우)
  const hasProductLines = (PRODUCT_LINES[form.product_category]?.length ?? 0) > 0
  const isProductLineRequired = hasProductLines && !form.product_line

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // 필수 입력 검증
    if (!form.product_name.trim()) {
      setError('제품명을 입력해주세요.')
      return
    }
    if (isProductLineRequired) {
      setError('제품군을 선택해주세요.')
      return
    }
    if (paymentMethod === 'TRANSFER' && !businessNumber.trim()) {
      setError('계좌이체 결제 시 사업자번호를 입력해주세요.')
      return
    }
    if (paymentMethod === 'TRANSFER' && receiptType === '세금계산서' && !taxEmail.trim()) {
      setError('세금계산서 수신 이메일을 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }

      const pendingData = {
        product_name: form.product_name,
        product_category: form.product_line
          ? `${form.product_category} > ${form.product_line}`
          : form.product_category,
        plan: form.plan,
        notes: form.notes,
        user_id: user.id,
      }
      localStorage.setItem('pending_apply', JSON.stringify(pendingData))

      const orderId = `nadlemok-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const amount = PLAN_AMOUNT[form.plan]

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey || clientKey === 'test_ck_placeholder') {
        setError('결제 키가 설정되지 않았습니다. 관리자에게 문의하세요.')
        setLoading(false)
        return
      }

      const toss = await loadTossPayments(clientKey)
      const payment = toss.payment({ customerKey: user.id })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (payment as any).requestPayment({
        method: paymentMethod,
        amount: { currency: 'KRW', value: amount },
        orderId,
        orderName: `나들목 ${plans.find(p => p.value === form.plan)?.name} 플랜 — ${form.product_name}`,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        customerEmail: user.email ?? undefined,
      })

    } catch (err) {
      console.error('결제 오류:', err)
      setError('결제 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text mb-6">서비스 신청</h1>

      <form onSubmit={handleSubmit}>
        {/* 제품 정보 */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                제품명 <span className="text-nogo">*</span>
              </label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="검증하고 싶은 제품명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                제품 카테고리 <span className="text-nogo">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => {
                  const available = AVAILABLE_CATEGORIES.includes(cat)
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={!available}
                      onClick={() => setForm({ ...form, product_category: cat, product_line: '' })}
                      className={`p-2.5 rounded-lg border text-sm text-center transition-all ${
                        form.product_category === cat
                          ? 'border-navy bg-navy/5 font-medium'
                          : available
                            ? 'border-border hover:border-navy/30'
                            : 'border-border text-text-muted/40 cursor-not-allowed bg-surface/50'
                      }`}
                    >
                      {cat}
                      {!available && <span className="block text-xs mt-0.5">준비중</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {hasProductLines && (
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  제품군 <span className="text-nogo">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_LINES[form.product_category].map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      onClick={() => setForm({ ...form, product_line: pl })}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        form.product_line === pl
                          ? 'border-navy bg-navy/5 font-medium'
                          : 'border-border hover:border-navy/30'
                      }`}
                    >
                      {pl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 플랜 선택 */}
        <Card className="mb-6">
          <label className="block text-sm font-medium text-text mb-3">서비스 플랜 선택</label>
          <div className="grid grid-cols-3 gap-3">
            {plans.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, plan: p.value })}
                className={`p-4 rounded-xl border text-center transition-all relative ${
                  form.plan === p.value
                    ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                    : 'border-border hover:border-navy/30'
                }`}
              >
                {p.value === 'standard' && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gold text-white text-xs rounded-full">
                    추천
                  </span>
                )}
                <div className="text-lg font-bold text-text">{p.name}</div>
                <div className="text-sm text-navy font-medium mt-1">{p.price}</div>
                <div className="text-xs text-text-muted mt-2">{p.detail}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* 기타 요청사항 */}
        <Card className="mb-6">
          <label className="block text-sm font-medium text-text mb-1.5">기타 요청사항</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-h-[80px]"
            placeholder="특이사항 등을 자유롭게 기입해주세요"
          />
        </Card>

        {/* 결제 수단 */}
        <Card className="mb-6">
          <label className="block text-sm font-medium text-text mb-3">결제 수단</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('CARD')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                paymentMethod === 'CARD'
                  ? 'border-navy bg-navy/5 ring-2 ring-navy/20 font-medium'
                  : 'border-border hover:border-navy/30'
              }`}
            >
              <svg className="w-5 h-5 text-navy flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <div className="text-left">
                <div>카드 결제</div>
                <div className="text-xs text-text-muted font-normal">신용·체크카드</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('TRANSFER')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                paymentMethod === 'TRANSFER'
                  ? 'border-navy bg-navy/5 ring-2 ring-navy/20 font-medium'
                  : 'border-border hover:border-navy/30'
              }`}
            >
              <svg className="w-5 h-5 text-navy flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
              </svg>
              <div className="text-left">
                <div>계좌이체</div>
                <div className="text-xs text-text-muted font-normal">실시간 이체</div>
              </div>
            </button>
          </div>

          {/* 계좌이체 선택 시 증빙 옵션 */}
          {paymentMethod === 'TRANSFER' && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* 증빙 유형 선택 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">증빙 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReceiptType('세금계산서')}
                    className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                      receiptType === '세금계산서'
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    세금계산서 발행
                  </button>
                  <button
                    type="button"
                    onClick={() => setReceiptType('현금영수증')}
                    className={`px-4 py-2.5 rounded-lg border text-sm transition-all ${
                      receiptType === '현금영수증'
                        ? 'border-navy bg-navy/5 font-medium'
                        : 'border-border hover:border-navy/30'
                    }`}
                  >
                    현금영수증 발행
                  </button>
                </div>
                {receiptType === '세금계산서' && (
                  <p className="text-xs text-text-muted mt-1.5">
                    결제 완료 후 담당자가 전자세금계산서를 발행합니다.
                  </p>
                )}
                {receiptType === '현금영수증' && (
                  <p className="text-xs text-text-muted mt-1.5">
                    사업자번호로 지출증빙 현금영수증이 자동 발행됩니다.
                  </p>
                )}
              </div>

              {/* 사업자번호 */}
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  사업자번호 <span className="text-nogo">*</span>
                </label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  placeholder="000-00-00000"
                />
              </div>

              {/* 세금계산서 수신 이메일 */}
              {receiptType === '세금계산서' && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    세금계산서 수신 이메일 <span className="text-nogo">*</span>
                  </label>
                  <input
                    type="email"
                    value={taxEmail}
                    onChange={(e) => setTaxEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    placeholder="tax@company.com"
                  />
                  <p className="text-xs text-text-muted mt-1.5">
                    내 프로필에서 수정할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 결제 금액 */}
        <div className="flex items-center justify-between px-1 mb-4">
          <span className="text-sm text-text-muted">결제 금액</span>
          <span className="text-lg font-bold text-navy">
            {PLAN_AMOUNT[form.plan].toLocaleString()}원
          </span>
        </div>

        {error && (
          <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          신청 및 결제하기
        </Button>
      </form>
    </div>
  )
}
