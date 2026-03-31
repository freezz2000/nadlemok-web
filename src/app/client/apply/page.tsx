'use client'

import { useState } from 'react'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }

      // 폼 데이터 임시 저장 (결제 성공 후 프로젝트 생성에 사용)
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

      // 토스페이먼츠 SDK 동적 로드
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk')
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
      if (!clientKey || clientKey === 'test_ck_placeholder') {
        setError('결제 키가 설정되지 않았습니다. 관리자에게 문의하세요.')
        setLoading(false)
        return
      }

      const toss = await loadTossPayments(clientKey)
      const payment = toss.payment({ customerKey: user.id })

      await payment.requestPayment({
        method: 'CARD',
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
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">제품명</label>
              <input
                type="text"
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20"
                placeholder="검증하고 싶은 제품명을 입력하세요"
                required
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">제품 카테고리</label>
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

            {/* 제품군 */}
            {(PRODUCT_LINES[form.product_category]?.length ?? 0) > 0 && (
              <div>
                <label className="block text-sm font-medium text-text mb-2">제품군</label>
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

        <Card className="mb-6">
          <label className="block text-sm font-medium text-text mb-3">서비스 플랜 선택</label>
          <div className="grid grid-cols-3 gap-3">
            {plans.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, plan: p.value })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  form.plan === p.value
                    ? 'border-navy bg-navy/5 ring-2 ring-navy/20'
                    : 'border-border hover:border-navy/30'
                } ${p.value === 'standard' ? 'relative' : ''}`}
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

        <Card className="mb-6">
          <label className="block text-sm font-medium text-text mb-1.5">기타 요청사항</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-h-[80px]"
            placeholder="특이사항 등을 자유롭게 기입해주세요"
          />
        </Card>

        {/* 결제 금액 요약 */}
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
