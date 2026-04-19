'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { CATEGORIES, PRODUCT_LINES, AVAILABLE_CATEGORIES } from '@/lib/template-constants'

type PanelOption = 'internal' | 'external_30' | 'external_50'

const PANEL_OPTIONS: {
  id: PanelOption
  tag: string
  label: string
  desc: string
  price: string
  priceNote: string
  duration: string
  features: string[]
  badge?: string
  accentColor: 'go' | 'navy' | 'gold'
}[] = [
  {
    id: 'internal',
    tag: '내부 패널',
    label: '무료로 시작',
    desc: '직원·지인을 초대해 빠르게 검증',
    price: '무료',
    priceNote: '패널 수 제한 없음',
    duration: '1~3일',
    features: [
      '직원·지인·SNS 팔로워 초대',
      '카카오 알림톡 초대 링크 발송',
      '전체 분석 리포트 제공',
      '신호등 판정 (Go / CGo / No-Go)',
    ],
    accentColor: 'go',
  },
  {
    id: 'external_30',
    tag: '외부 패널 30명',
    label: '소비자 검증',
    desc: '나들목 소비자 패널 30인으로 검증',
    price: '500,000원',
    priceNote: '크레딧 30개 소모',
    duration: '5~7일',
    features: [
      '나들목 검증 패널 30명 배정',
      '샘플 소분·배송 대행 포함',
      '피부타입·연령 코호트 분석',
      '전체 분석 리포트 제공',
    ],
    accentColor: 'navy',
  },
  {
    id: 'external_50',
    tag: '외부 패널 50명',
    label: '표준 검증',
    desc: '나들목 소비자 패널 50인으로 검증',
    price: '800,000원',
    priceNote: '크레딧 50개 소모 · 16,000원/인',
    duration: '5~7일',
    features: [
      '나들목 검증 패널 50명 배정',
      '샘플 소분·배송 대행 포함',
      '피부타입·연령 코호트 분석',
      '전체 분석 리포트 제공',
    ],
    badge: '추천',
    accentColor: 'gold',
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
  const selected = PANEL_OPTIONS.find(o => o.id === panelOption)!

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

      const isExternal = panelOption !== 'internal'
      const externalCount = panelOption === 'external_30' ? 30 : panelOption === 'external_50' ? 50 : 0

      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: form.product_name,
          product_category: productCategory,
          panel_source: isExternal ? 'external' : 'internal',
          external_panel_count: externalCount,
          panel_size: isExternal ? externalCount : 10,
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
        {/* ── 제품 정보 ── */}
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

        {/* ── 패널 유형 선택 ── */}
        <div className="mb-6">
          <p className="text-sm font-medium text-text mb-3">
            패널 유형 선택 <span className="text-nogo">*</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PANEL_OPTIONS.map((opt) => {
              const isSelected = panelOption === opt.id

              const accent = {
                go:   { border: 'border-go',   bg: 'bg-go/5',   text: 'text-go',   dot: 'bg-go',   tag: 'bg-go/10 text-go'   },
                navy: { border: 'border-navy',  bg: 'bg-navy/5', text: 'text-navy', dot: 'bg-navy', tag: 'bg-navy/10 text-navy' },
                gold: { border: 'border-gold',  bg: 'bg-gold/5', text: 'text-gold', dot: 'bg-gold', tag: 'bg-gold/10 text-gold' },
              }[opt.accentColor]

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPanelOption(opt.id)}
                  className={`relative text-left rounded-xl border-2 transition-all ${
                    isSelected ? `${accent.border} ${accent.bg}` : 'border-border bg-white hover:border-border/60'
                  }`}
                >
                  {/* 추천 배지 */}
                  {opt.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-3 py-0.5 bg-gold text-navy font-bold rounded-full whitespace-nowrap shadow-sm">
                      {opt.badge}
                    </span>
                  )}

                  <div className="p-4 pt-5">
                    {/* 상단: 태그 + 라디오 */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isSelected ? accent.tag : 'bg-surface text-text-muted'}`}>
                        {opt.tag}
                      </span>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected ? accent.border : 'border-border'
                      }`}>
                        {isSelected && <div className={`w-2 h-2 rounded-full ${accent.dot}`} />}
                      </div>
                    </div>

                    {/* 가격 */}
                    <div className={`text-xl font-black mb-0.5 ${isSelected ? accent.text : 'text-text'}`}>
                      {opt.price}
                    </div>
                    <p className="text-xs text-text-muted mb-3">{opt.priceNote}</p>

                    {/* 설명 */}
                    <p className="text-xs text-text-muted leading-relaxed mb-3">{opt.desc}</p>

                    {/* 기간 */}
                    <div className={`flex items-center gap-1.5 text-xs font-medium mb-3 ${isSelected ? accent.text : 'text-text-muted'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      완료까지 {opt.duration}
                    </div>

                    {/* 포함 내용 */}
                    <ul className="space-y-1.5">
                      {opt.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-text-muted">
                          <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isSelected ? accent.text : 'text-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 외부 패널 선택 시 안내 */}
          {panelOption !== 'internal' && (
            <div className="mt-3 flex items-start gap-2 px-4 py-3 bg-navy/5 border border-navy/20 rounded-lg">
              <svg className="w-4 h-4 text-navy flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-navy/80 leading-relaxed">
                외부 패널 비용은 프로젝트 생성 후 <strong>패널 설정 단계</strong>에서 크레딧으로 결제합니다.
                크레딧이 부족하면 <strong>구독 페이지</strong>에서 충전할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mb-4">
            {error}
          </p>
        )}

        {/* ── CTA 버튼 ── */}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {panelOption === 'internal'
            ? '프로젝트 시작하기 — 무료'
            : `프로젝트 시작하기 — 외부 패널 ${panelOption === 'external_30' ? '30명' : '50명'} (${selected.price})`}
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
