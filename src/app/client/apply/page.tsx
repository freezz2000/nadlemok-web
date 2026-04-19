'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'

type PanelOption = 'internal' | 'external_30' | 'external_50'

const PANEL_OPTIONS: {
  id: PanelOption
  label: string
  sub: string
  price: string
  priceDetail: string
  badge?: string
  color: 'go' | 'navy' | 'gold'
}[] = [
  {
    id: 'internal',
    label: '내부 패널',
    sub: '직원·지인을 초대해 빠르게 검증',
    price: '무료',
    priceDetail: '패널 수 제한 없음',
    color: 'go',
  },
  {
    id: 'external_30',
    label: '외부 패널 30명',
    sub: '나들목 소비자 패널 30인 검증',
    price: '500,000원',
    priceDetail: '크레딧 30개 소모',
    color: 'navy',
  },
  {
    id: 'external_50',
    label: '외부 패널 50명',
    sub: '나들목 소비자 패널 50인 검증',
    price: '800,000원',
    priceDetail: '크레딧 50개 소모',
    badge: '추천',
    color: 'gold',
  },
]

export default function ServiceApplyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelOption, setPanelOption] = useState<PanelOption>('internal')
  const [form, setForm] = useState({
    product_name: '',
    product_category: '화장품',
    product_line: '',
  })

  const hasProductLines = (PRODUCT_LINES[form.product_category]?.length ?? 0) > 0
  const isProductLineRequired = hasProductLines && !form.product_line

  const selectedOption = PANEL_OPTIONS.find(o => o.id === panelOption)!

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
      const productCategory = form.product_line
        ? `${form.product_category} > ${form.product_line}`
        : form.product_category

      const externalCount = panelOption === 'external_30' ? 30 : panelOption === 'external_50' ? 50 : 0

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: form.product_name,
          product_category: productCategory,
          panel_source: panelOption === 'internal' ? 'internal' : 'external',
          external_panel_count: externalCount,
          panel_size: externalCount || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '프로젝트 생성 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      router.push(`/client/projects/${data.projectId}/panel-setup`)
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
          제품 정보를 입력하고 패널 유형을 선택하세요
        </p>
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
          </div>
        </Card>

        {/* 패널 유형 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-text mb-3">
            패널 유형 선택 <span className="text-nogo">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PANEL_OPTIONS.map((opt) => {
              const isSelected = panelOption === opt.id
              const borderColor =
                opt.color === 'go' ? 'border-go' :
                opt.color === 'gold' ? 'border-gold' : 'border-navy'
              const bgColor =
                opt.color === 'go' ? 'bg-go/5' :
                opt.color === 'gold' ? 'bg-gold/5' : 'bg-navy/5'
              const textColor =
                opt.color === 'go' ? 'text-go' :
                opt.color === 'gold' ? 'text-gold' : 'text-navy'

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPanelOption(opt.id)}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? `${borderColor} ${bgColor}`
                      : 'border-border hover:border-border/80 bg-white'
                  }`}
                >
                  {/* 추천 배지 */}
                  {opt.badge && (
                    <span className="absolute top-3 right-3 text-xs px-2 py-0.5 bg-gold text-navy font-bold rounded-full">
                      {opt.badge}
                    </span>
                  )}

                  {/* 선택 체크 */}
                  <div className={`w-4 h-4 rounded-full border-2 mb-3 flex items-center justify-center transition-all ${
                    isSelected ? `${borderColor} ${bgColor}` : 'border-border'
                  }`}>
                    {isSelected && (
                      <div className={`w-2 h-2 rounded-full ${
                        opt.color === 'go' ? 'bg-go' : opt.color === 'gold' ? 'bg-gold' : 'bg-navy'
                      }`} />
                    )}
                  </div>

                  <p className={`text-sm font-bold mb-0.5 ${isSelected ? textColor : 'text-text'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-text-muted mb-3 leading-relaxed">{opt.sub}</p>

                  <div className={`text-base font-black ${isSelected ? textColor : 'text-text'}`}>
                    {opt.price}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{opt.priceDetail}</p>
                </button>
              )
            })}
          </div>

          {/* 외부 패널 선택 시 안내 */}
          {panelOption !== 'internal' && (
            <div className="mt-3 flex items-start gap-2 px-4 py-3 bg-navy/5 border border-navy/20 rounded-lg">
              <span className="text-navy mt-0.5">ℹ</span>
              <p className="text-xs text-navy/80 leading-relaxed">
                외부 패널은 프로젝트 생성 후 <strong>패널 설정 단계</strong>에서 크레딧으로 결제합니다.
                크레딧이 부족하면 구독 페이지에서 충전 가능합니다.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          {panelOption === 'internal'
            ? '프로젝트 시작하기 — 무료'
            : `프로젝트 시작하기 — 외부 패널 ${panelOption === 'external_30' ? '30명' : '50명'} (${selectedOption.price})`}
        </Button>

        <p className="text-xs text-text-muted text-center mt-3">
          {panelOption === 'internal'
            ? '설문 설정 → 직원 초대 → 테스트 → 무료 분석 결과 확인'
            : '설문 설정 → 크레딧 결제 → 외부 패널 테스트 → 분석 결과 확인'}
        </p>
      </form>
    </div>
  )
}
