'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'
import type { ServicePlan } from '@/lib/types'

export default function ServiceApplyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    product_name: '',
    product_category: '화장품',
    product_line: '',
    plan: 'standard' as ServicePlan,
    notes: '',
  })

  const plans: { value: ServicePlan; name: string; price: string; detail: string }[] = [
    { value: 'basic', name: 'Basic', price: '200만원', detail: '50명 / 10일 / 3단계 분석' },
    { value: 'standard', name: 'Standard', price: '300만원', detail: '50명 / 10일 / 5단계 분석' },
    { value: 'premium', name: 'Premium', price: '500만원', detail: '100명 / 15일 / 9단계 분석' },
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const planConfig = { basic: { panel: 50, duration: 10 }, standard: { panel: 50, duration: 10 }, premium: { panel: 100, duration: 15 } }

    const { error } = await supabase.from('projects').insert({
      client_id: user.id,
      product_name: form.product_name,
      product_category: form.product_line
        ? `${form.product_category} > ${form.product_line}`
        : form.product_category,
      plan: form.plan,
      panel_size: planConfig[form.plan].panel,
      test_duration: planConfig[form.plan].duration,
      status: 'pending',
    })

    if (!error) {
      window.location.href = '/client/projects'
    }
    setLoading(false)
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

        <Button type="submit" loading={loading} className="w-full" size="lg">
          신청하기
        </Button>
      </form>
    </div>
  )
}
