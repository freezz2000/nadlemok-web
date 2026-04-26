'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import {
  AGE_RANGE_OPTIONS,
  SKIN_TYPE_OPTIONS,
  SKIN_CONCERN_OPTIONS,
} from '@/lib/pricing'

type PanelSource = 'internal' | 'external'

export default function PanelSetupPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [productName, setProductName] = useState('')
  const [plan, setPlan] = useState<string>('')
  const [panelSize, setPanelSize] = useState<number | null>(null)
  const [testDuration, setTestDuration] = useState<number | null>(null)
  const [selected, setSelected] = useState<PanelSource | null>(null)
  const [panelSourceFixed, setPanelSourceFixed] = useState(false)
  const [externalCount, setExternalCount] = useState(30)
  const [deliveryService, setDeliveryService] = useState(false)
  const [ageRanges, setAgeRanges] = useState<string[]>([])
  const [skinTypes, setSkinTypes] = useState<string[]>([])
  const [skinConcerns, setSkinConcerns] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      // 프로젝트 정보
      const res = await fetch(`/api/projects/${projectId}/info`)
      const d = await res.json()
      if (d.product_name) setProductName(d.product_name)
      if (d.plan) setPlan(d.plan)
      if (d.panel_size != null) setPanelSize(d.panel_size)
      if (d.test_duration != null) setTestDuration(d.test_duration)
      if (d.panel_source) {
        setSelected(d.panel_source as PanelSource)
        setPanelSourceFixed(true)

        // 내부 패널은 설정 없이 바로 설문 설정으로 이동
        if (d.panel_source === 'internal') {
          await fetch('/api/projects/panel-setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              panelSource: 'internal',
              externalPanelCount: 0,
              deliveryService: false,
              ageRanges: [],
              skinTypes: [],
              skinConcerns: [],
            }),
          })
          router.push(`/client/projects/${projectId}`)
          return
        }
      }
      if (d.external_panel_count) setExternalCount(d.external_panel_count)
      if (d.ageRanges?.length) setAgeRanges(d.ageRanges)
      if (d.skinTypes?.length) setSkinTypes(d.skinTypes)
      if (d.skinConcerns?.length) setSkinConcerns(d.skinConcerns)

      // 크레딧 잔액
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: cr } = await supabase
          .from('client_credits')
          .select('balance')
          .eq('client_id', user.id)
          .single()
        setCreditBalance(cr?.balance ?? 0)
      }
    }
    load().catch(() => {})
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleItem(arr: string[], val: string, setter: (v: string[]) => void) {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  async function handleConfirm() {
    if (!selected) return
    setSaving(true)
    setError(null)

    const res = await fetch(`/api/projects/panel-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        panelSource: selected,
        externalPanelCount: selected === 'external' ? externalCount : 0,
        deliveryService: selected === 'external' ? deliveryService : false,
        ageRanges: selected === 'external' ? ageRanges : [],
        skinTypes: selected === 'external' ? skinTypes : [],
        skinConcerns: selected === 'external' ? skinConcerns : [],
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || '오류가 발생했습니다.'); return }

    // 패널유형 설정 후 항상 설문설정 화면으로 이동
    router.push(`/client/projects/${projectId}`)
  }

  // 선택한 요금제 표시 정보 계산
  const planLabel = selected === 'internal'
    ? '내부 패널'
    : selected === 'external'
      ? `외부 패널 ${externalCount}명`
      : plan ? plan.toUpperCase() : '—'

  const priceLabel = selected === 'internal'
    ? '무료'
    : selected === 'external'
      ? (externalCount >= 50 ? '800,000원' : '500,000원')
      : '—'

  const durationLabel = selected === 'internal'
    ? '1~3일'
    : selected === 'external'
      ? '5~7일'
      : testDuration != null ? `${testDuration}일` : '—'

  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-navy/5 text-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
          <span>프로젝트 생성 완료</span>
          <span className="text-navy/40">→</span>
          <span className="text-navy">{panelSourceFixed ? '패널 설정' : '패널 선택'}</span>
        </div>
        <h1 className="text-2xl font-bold text-text">
          {panelSourceFixed ? '패널 설정을 완료해주세요' : '어떤 방식으로 진행할까요?'}
        </h1>
        {productName && (
          <p className="text-sm text-text-muted mt-1.5">{productName}</p>
        )}
      </div>

      {/* 프로젝트 기본 정보 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-text-muted">패널 유형</p>
          <p className="text-base font-bold text-navy mt-0.5 leading-tight">{planLabel}</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-text-muted">비용</p>
          <p className="text-base font-bold text-go mt-0.5">{priceLabel}</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-text-muted">완료까지</p>
          <p className="text-base font-bold text-text mt-0.5">{durationLabel}</p>
        </div>
        <div className="bg-white border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-text-muted">응답 진행</p>
          <p className="text-lg font-bold text-go mt-0.5">0 / 0</p>
        </div>
      </div>

      {/* 선택 카드 2개 — apply 페이지에서 이미 선택한 경우 숨김 */}
      {!panelSourceFixed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* 내부 패널 카드 */}
          <button
            type="button"
            onClick={() => setSelected('internal')}
            className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
              selected === 'internal'
                ? 'border-go bg-go/5 shadow-sm'
                : 'border-border hover:border-go/40 bg-white'
            }`}
          >
            {selected === 'internal' && (
              <span className="absolute top-4 right-4 w-5 h-5 bg-go rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${
              selected === 'internal' ? 'bg-go/10' : 'bg-surface'
            }`}>
              👥
            </div>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-text">내부 패널</h2>
                <span className="text-xs font-semibold text-go bg-go/10 px-2 py-0.5 rounded-full">무료</span>
              </div>
              <p className="text-xs text-text-muted">직원·팀원·지인을 초대해서 빠르게 검증</p>
            </div>
            <ul className="space-y-2">
              {[
                { icon: '⚡', text: '1~3일 이내 완료' },
                { icon: '📱', text: '카카오 링크로 간편 초대' },
                { icon: '📊', text: '자동 분석 리포트 제공' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className={`mt-4 pt-4 border-t ${selected === 'internal' ? 'border-go/20' : 'border-border'}`}>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-text">적합한 경우</span><br />
                초기 내부 검증, 빠른 피드백 수집
              </p>
            </div>
          </button>

          {/* 외부 패널 카드 */}
          <button
            type="button"
            onClick={() => setSelected('external')}
            className={`relative text-left p-6 rounded-2xl border-2 transition-all duration-200 ${
              selected === 'external'
                ? 'border-navy bg-navy/5 shadow-sm'
                : 'border-border hover:border-navy/40 bg-white'
            }`}
          >
            {selected === 'external' && (
              <span className="absolute top-4 right-4 w-5 h-5 bg-navy rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${
              selected === 'external' ? 'bg-navy/10' : 'bg-surface'
            }`}>
              🔍
            </div>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-text">외부 패널</h2>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">유료</span>
              </div>
              <p className="text-xs text-text-muted">나들목 전문 패널풀에서 실제 소비자 검증</p>
            </div>
            <ul className="space-y-2">
              {[
                { icon: '👤', text: '실제 타겟 소비자 검증' },
                { icon: '🚚', text: '배송 포함 약 5일 소요' },
                { icon: '📈', text: '통계적으로 유의미한 분석' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-text-muted">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className={`mt-4 pt-4 border-t ${selected === 'external' ? 'border-navy/20' : 'border-border'}`}>
              <p className="text-xs text-text-muted">
                <span className="font-medium text-text">적합한 경우</span><br />
                출시 전 소비자 반응 검증, 정식 리포트 필요
              </p>
            </div>
          </button>
        </div>
      )}

      {/* 외부 패널 선택 시 — 상세 설정 */}
      {selected === 'external' && (
        <div className="mb-6 space-y-5 bg-surface rounded-2xl p-6 border border-border">
          <h3 className="text-sm font-semibold text-text">외부 패널 설정</h3>

          {/* 인원 수 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text">희망 패널 수</label>
              <span className="text-lg font-bold text-navy">{externalCount}명</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={externalCount}
              onChange={e => setExternalCount(Number(e.target.value))}
              className="w-full accent-navy"
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>10명</span>
              <span className="text-navy/60">N≥30 통계 권장</span>
              <span>100명</span>
            </div>
          </div>

          {/* 연령대 */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">연령대 <span className="text-text-muted font-normal">(복수 선택)</span></label>
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
            <label className="block text-sm font-medium text-text mb-2">피부 타입 <span className="text-text-muted font-normal">(복수 선택)</span></label>
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
            <label className="block text-sm font-medium text-text mb-2">주요 피부 고민 <span className="text-text-muted font-normal">(복수 선택)</span></label>
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
          <label className="flex items-start gap-3 p-4 bg-white rounded-xl border border-border cursor-pointer hover:border-navy/30 transition-colors">
            <input
              type="checkbox"
              checked={deliveryService}
              onChange={e => setDeliveryService(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-navy"
            />
            <div>
              <p className="font-medium text-text text-sm">샘플 배송 대행 신청</p>
              <p className="text-xs text-text-muted mt-0.5">
                고객사 → 나들목 → 패널로 소분 배송
                <span className="ml-2 text-amber-600 font-medium">+1,000원/인</span>
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                미선택 시 패널 주소 목록 제공 · 고객사 직접 발송
              </p>
            </div>
          </label>

          {/* 예상 견적 / 크레딧 / 구독 플랜 — 숨김 처리 */}
        </div>
      )}

      {error && (
        <p className="text-sm text-nogo bg-nogo/5 border border-nogo/20 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <Button
        onClick={handleConfirm}
        loading={saving}
        disabled={!selected}
        className="w-full"
        size="lg"
      >
        {selected === 'external'
          ? '다음 — 패널 선택하기'
          : selected === 'internal'
            ? '시작하기 — 설문 설정으로'
            : '방식을 선택해주세요'}
      </Button>

      {!selected && (
        <p className="text-xs text-text-muted text-center mt-3">
          나중에 설정에서 변경할 수 있습니다
        </p>
      )}
    </div>
  )
}
