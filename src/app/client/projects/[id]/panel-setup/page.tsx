'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Card, { CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import {
  AGE_RANGE_OPTIONS,
  SKIN_TYPE_OPTIONS,
  SKIN_CONCERN_OPTIONS,
  calculateQuote,
  getQuoteBreakdown,
  formatKRW,
} from '@/lib/pricing'

type PanelSource = 'internal' | 'external' | 'mixed'

export default function PanelSetupPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()

  const [productName, setProductName] = useState('')
  const [panelSource, setPanelSource] = useState<PanelSource>('internal')
  const [externalCount, setExternalCount] = useState(20)
  const [deliveryService, setDeliveryService] = useState(false)
  const [ageRanges, setAgeRanges] = useState<string[]>([])
  const [skinTypes, setSkinTypes] = useState<string[]>([])
  const [skinConcerns, setSkinConcerns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/info`)
      .then(r => r.json())
      .then(d => { if (d.product_name) setProductName(d.product_name) })
      .catch(() => {})
  }, [projectId])

  const hasExternal = panelSource === 'external' || panelSource === 'mixed'
  const quote = hasExternal ? calculateQuote(externalCount, deliveryService) : null
  const breakdown = hasExternal ? getQuoteBreakdown(externalCount, deliveryService) : null

  function toggleItem(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/projects/panel-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        panelSource,
        externalPanelCount: hasExternal ? externalCount : 0,
        deliveryService: hasExternal ? deliveryService : false,
        ageRanges: hasExternal ? ageRanges : [],
        skinTypes: hasExternal ? skinTypes : [],
        skinConcerns: hasExternal ? skinConcerns : [],
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return }

    if (hasExternal) {
      router.push(`/client/projects/${projectId}/panel-match`)
    } else {
      router.push(`/client/projects/${projectId}`)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/client/projects/${projectId}`} className="text-sm text-text-muted hover:text-text mb-1 inline-block">
          ← 프로젝트로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-text">패널 설정</h1>
        {productName && <p className="text-sm text-text-muted mt-0.5">{productName}</p>}
      </div>

      {/* 패널 방식 선택 */}
      <Card className="mb-6">
        <CardTitle>패널 방식 선택</CardTitle>
        <div className="mt-4 space-y-3">
          {([
            { value: 'internal', label: '내부 패널만', desc: '직원·지인을 직접 초대 — 무료' },
            { value: 'external', label: '외부 패널만', desc: '나들목 전문 패널풀 — 유료 (실제 타겟 소비자)' },
            { value: 'mixed',    label: '내부 + 외부 혼합', desc: '내부 초대 + 나들목 패널 보완 — 외부 패널 부분만 유료' },
          ] as { value: PanelSource; label: string; desc: string }[]).map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                panelSource === opt.value
                  ? 'border-navy bg-navy/5'
                  : 'border-border hover:border-navy/30'
              }`}
            >
              <input
                type="radio"
                name="panelSource"
                value={opt.value}
                checked={panelSource === opt.value}
                onChange={() => setPanelSource(opt.value)}
                className="mt-0.5 accent-navy"
              />
              <div>
                <p className="font-medium text-text text-sm">{opt.label}</p>
                <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
              </div>
              {opt.value !== 'internal' && (
                <span className="ml-auto text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full shrink-0">유료</span>
              )}
            </label>
          ))}
        </div>
      </Card>

      {/* 외부 패널 설정 */}
      {hasExternal && (
        <>
          <Card className="mb-6">
            <CardTitle>외부 패널 설정</CardTitle>
            <div className="mt-4 space-y-6">
              {/* 인원 수 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  희망 패널 수 <span className="text-nogo">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={externalCount}
                    onChange={e => setExternalCount(Number(e.target.value))}
                    className="flex-1 accent-navy"
                  />
                  <span className="w-16 text-center font-bold text-navy text-lg">{externalCount}명</span>
                </div>
                <p className="text-xs text-text-muted mt-1">최소 10명 · 최대 100명 (통계 유의성: N≥30 권장)</p>
              </div>

              {/* 연령대 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">연령대 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {AGE_RANGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleItem(ageRanges, opt.value, setAgeRanges)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        ageRanges.includes(opt.value)
                          ? 'border-navy bg-navy/5 font-medium text-navy'
                          : 'border-border text-text-muted hover:border-navy/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 피부 타입 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">피부 타입 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleItem(skinTypes, opt.value, setSkinTypes)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        skinTypes.includes(opt.value)
                          ? 'border-navy bg-navy/5 font-medium text-navy'
                          : 'border-border text-text-muted hover:border-navy/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 피부 고민 */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">주요 피부 고민 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {SKIN_CONCERN_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleItem(skinConcerns, opt.value, setSkinConcerns)}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${
                        skinConcerns.includes(opt.value)
                          ? 'border-navy bg-navy/5 font-medium text-navy'
                          : 'border-border text-text-muted hover:border-navy/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 샘플 배송 대행 */}
              <div className="p-4 bg-surface rounded-xl border border-border">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryService}
                    onChange={e => setDeliveryService(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-navy"
                  />
                  <div>
                    <p className="font-medium text-text text-sm">샘플 배송 대행 신청</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      고객사 → 나들목 샘플 발송 → 나들목이 소분 후 패널 배포
                      <span className="ml-2 text-amber-600">(+{formatKRW(1_000)}/인)</span>
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      미선택 시: 패널 주소 목록 제공, 고객사가 직접 배송
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </Card>

          {/* 견적 */}
          {quote && breakdown && (
            <Card className="mb-6 border-gold/30 bg-gold/5">
              <CardTitle>예상 견적</CardTitle>
              <div className="mt-4 space-y-2">
                {breakdown.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm py-1.5">
                      <span className="text-text-muted">{item.label}</span>
                      <span className="font-medium text-text">{formatKRW(item.amount)}</span>
                    </div>
                    {item.sub.map((s, j) => (
                      <div key={j} className="flex justify-between text-xs py-0.5 pl-4 text-text-muted">
                        <span>└ {s.label}</span>
                        <span>{formatKRW(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div className="border-t border-gold/30 pt-3 mt-2 flex justify-between">
                  <span className="font-bold text-navy">합계</span>
                  <span className="font-bold text-navy text-lg">{formatKRW(breakdown.total)}</span>
                </div>
                <p className="text-xs text-text-muted">* 부가세(VAT) 별도</p>
              </div>
            </Card>
          )}
        </>
      )}

      {error && (
        <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
        {hasExternal ? '다음 — 패널 선택하기' : '저장하고 시작하기'}
      </Button>
    </div>
  )
}
