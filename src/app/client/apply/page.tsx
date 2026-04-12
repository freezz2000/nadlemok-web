'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'

export default function ServiceApplyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    product_name: '',
    product_category: '화장품',
    product_line: '',
    notes: '',
  })

  const hasProductLines = (PRODUCT_LINES[form.product_category]?.length ?? 0) > 0
  const isProductLineRequired = hasProductLines && !form.product_line

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.product_name.trim()) {
      setError('제품명을 입력해주세요.')
      return
    }
    if (isProductLineRequired) {
      setError('제품군을 선택해주세요.')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('로그인이 필요합니다.'); setLoading(false); return }

      const productCategory = form.product_line
        ? `${form.product_category} > ${form.product_line}`
        : form.product_category

      const { data: project, error: insertError } = await supabase
        .from('projects')
        .insert({
          client_id: user.id,
          product_name: form.product_name,
          product_category: productCategory,
          plan: 'basic',
          panel_size: 10,
          test_duration: 14,
          notes: form.notes || null,
          status: 'draft',
          panel_source: 'internal',
        })
        .select('id')
        .single()

      if (insertError || !project) {
        setError('프로젝트 생성 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      router.push(`/client/projects/${project.id}`)
    } catch (err) {
      console.error('apply error:', err)
      setError('오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">새 프로젝트 시작</h1>
        <p className="text-sm text-text-muted mt-1">
          제품 정보를 입력하면 무료로 바로 시작할 수 있습니다
        </p>
      </div>

      {/* 무료 안내 배너 */}
      <div className="flex items-center gap-3 px-4 py-3 bg-go-bg border border-go/20 rounded-xl mb-6">
        <span className="text-go text-lg">✓</span>
        <div>
          <p className="text-sm font-medium text-go">Basic 분석은 무료</p>
          <p className="text-xs text-go/80 mt-0.5">신호등 판정 · 전반 만족도 · Kill Signal 유무 확인 가능</p>
        </div>
      </div>

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
                autoFocus
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

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">기타 요청사항</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 min-h-[60px] resize-none"
                placeholder="특이사항 등을 자유롭게 기입해주세요 (선택)"
              />
            </div>
          </div>
        </Card>

        {error && (
          <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          프로젝트 시작하기 — 무료
        </Button>

        <p className="text-xs text-text-muted text-center mt-3">
          설문 설정 → 패널 초대 → 테스트 → 무료 분석 결과 확인
        </p>
      </form>
    </div>
  )
}
