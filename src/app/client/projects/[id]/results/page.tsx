'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { AnalysisResult, Verdict } from '@/lib/types'

// ── 판정별 스타일 ──────────────────────────────────────────────
const VERDICT_CONFIG: Record<Verdict, {
  bg: string; border: string; text: string; lightBg: string
  label: string; desc: string; trafficLight: 'go' | 'cgo' | 'nogo'
}> = {
  'GO': {
    bg: 'bg-go', border: 'border-go', text: 'text-go', lightBg: 'bg-go-bg',
    label: 'GO', desc: '현재 처방 유지. 확정된 메인 셀링 포인트로 상세페이지 및 마케팅 전략 수립.',
    trafficLight: 'go',
  },
  'CONDITIONAL GO': {
    bg: 'bg-cgo', border: 'border-cgo', text: 'text-cgo', lightBg: 'bg-cgo-bg',
    label: 'Conditional GO', desc: '연구소 피드백 전달. 특정 요인 수정 후 2차 샘플 재검증.',
    trafficLight: 'cgo',
  },
  'NO-GO': {
    bg: 'bg-nogo', border: 'border-nogo', text: 'text-nogo', lightBg: 'bg-nogo-bg',
    label: 'NO-GO', desc: '즉시 출시 중단. 현 처방 전면 폐기 및 원점 재설계.',
    trafficLight: 'nogo',
  },
}

// ── 신호등 컴포넌트 ───────────────────────────────────────────
function TrafficLight({ active }: { active: 'go' | 'cgo' | 'nogo' }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-gray-800 rounded-2xl px-4 py-5 shadow-lg w-16">
      {/* 빨강 */}
      <div className={`w-9 h-9 rounded-full transition-all ${
        active === 'nogo' ? 'bg-nogo shadow-[0_0_12px_4px] shadow-nogo/60' : 'bg-gray-600'
      }`} />
      {/* 노랑 */}
      <div className={`w-9 h-9 rounded-full transition-all ${
        active === 'cgo' ? 'bg-cgo shadow-[0_0_12px_4px] shadow-cgo/60' : 'bg-gray-600'
      }`} />
      {/* 초록 */}
      <div className={`w-9 h-9 rounded-full transition-all ${
        active === 'go' ? 'bg-go shadow-[0_0_12px_4px] shadow-go/60' : 'bg-gray-600'
      }`} />
    </div>
  )
}

// ── CI 도트 차트 (가로) ───────────────────────────────────────
function CiDotChart({
  items,
  threshold = 3.0,
  maxVal = 4.0,
}: {
  items: { label: string; mean: number; ci_lower: number; ci_upper: number }[]
  threshold?: number
  maxVal?: number
}) {
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - 1) / (maxVal - 1)) * 100))
  const thresholdPct = toPercent(threshold)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-text w-48 flex-shrink-0 leading-snug">{item.label}</span>
            <div className="flex-1 relative h-7">
              {/* 배경 */}
              <div className="absolute inset-y-2.5 left-0 right-0 bg-surface-dark rounded-full" />
              {/* CI 범위 바 */}
              <div
                className="absolute inset-y-3 rounded-full bg-navy/25"
                style={{
                  left: `${toPercent(item.ci_lower)}%`,
                  right: `${100 - toPercent(item.ci_upper)}%`,
                }}
              />
              {/* 평균 도트 */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-navy border-2 border-white shadow-sm z-10"
                style={{ left: `calc(${toPercent(item.mean)}% - 8px)` }}
              />
              {/* 기준선 */}
              <div
                className="absolute inset-y-0 w-px bg-cgo/70 z-20"
                style={{ left: `${thresholdPct}%` }}
              />
            </div>
            <div className="text-right flex-shrink-0 w-28">
              <span className="text-sm font-bold text-navy">{(item.mean ?? 0).toFixed(2)}</span>
              <span className="text-xs text-text-muted ml-1">
                {item.ci_lower != null && item.ci_upper != null
                  ? `[${item.ci_lower.toFixed(2)}~${item.ci_upper.toFixed(2)}]`
                  : ''}
              </span>
            </div>
          </div>
        </div>
      ))}
      {/* 눈금 */}
      <div className="flex items-center gap-2 mt-1">
        <div className="w-48 flex-shrink-0" />
        <div className="flex-1 flex justify-between text-xs text-text-muted px-0.5">
          <span>1.0</span>
          <span>2.0</span>
          <span className="text-cgo font-medium">기준({threshold.toFixed(1)})</span>
          <span>3.5</span>
          <span>4.0</span>
        </div>
        <div className="w-28 flex-shrink-0" />
      </div>
    </div>
  )
}

// ── Key Drivers 기여도 바 ─────────────────────────────────────
function DriverBar({ label, r, rank }: { label: string; r: number; rank: number }) {
  const pct = Math.abs(r) * 100 * 5   // r=0.2 → 100% 기준 조정
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-xs text-text-muted w-5 flex-shrink-0">{rank}순위</span>
      <span className="text-sm text-text flex-1 leading-snug">{label}</span>
      <div className="w-36 h-6 bg-surface-dark rounded-sm overflow-hidden flex-shrink-0">
        <div
          className="h-full bg-navy rounded-sm transition-all"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-navy w-16 text-right flex-shrink-0">
        r = {(r ?? 0).toFixed(3)}
      </span>
    </div>
  )
}

// ── KS 레벨 배지 ─────────────────────────────────────────────
function KsBadge({ level }: { level: 'safe' | 'warning' | 'danger' }) {
  const map = {
    safe:    { bg: 'bg-go-bg',   text: 'text-go',   label: 'Pass' },
    warning: { bg: 'bg-cgo-bg',  text: 'text-cgo',  label: 'Warning' },
    danger:  { bg: 'bg-nogo-bg', text: 'text-nogo',  label: 'Fail' },
  }
  const { bg, text, label } = map[level]
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {level === 'warning' && <span className="mr-1">⚠</span>}
      {level === 'danger'  && <span className="mr-1">✕</span>}
      {level === 'safe'    && <span className="mr-1">✓</span>}
      {label}
    </span>
  )
}

// ── 섹션 헤더 ────────────────────────────────────────────────
function SectionTitle({ step, title, sub }: { step: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">{step}</span>
      </div>
      <h2 className="text-xl font-bold text-text">{title}</h2>
      {sub && <p className="text-sm text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

// ── 콜아웃 박스 ──────────────────────────────────────────────
function Callout({ icon, children, variant = 'info' }: {
  icon?: string; children: React.ReactNode; variant?: 'info' | 'warning' | 'success'
}) {
  const styles = {
    info:    'bg-navy/5 border-navy/20 text-navy',
    warning: 'bg-cgo-bg border-cgo/30 text-cgo',
    success: 'bg-go-bg border-go/30 text-go',
  }
  return (
    <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm mt-4 ${styles[variant]}`}>
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <p>{children}</p>
    </div>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────
export default function ResultsPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [productName, setProductName] = useState('')
  const [panelSize, setPanelSize] = useState(0)
  const [satThreshold, setSatThreshold] = useState(3.0)
  const [panelSource, setPanelSource] = useState<'internal' | 'external' | 'mixed'>('internal')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const [{ data: analysis }, { data: project }] = await Promise.all([
      supabase.from('analysis_results').select('*').eq('project_id', id).single(),
      supabase.from('projects').select('product_name, panel_size, satisfaction_threshold, panel_source').eq('id', id).single(),
    ])
    setResult(analysis)
    setProductName(project?.product_name || '')
    setPanelSize(project?.panel_size || 50)
    setSatThreshold(project?.satisfaction_threshold ?? 3.0)
    setPanelSource((project?.panel_source as 'internal' | 'external' | 'mixed') || 'internal')

  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="w-12 h-12 border-4 border-navy/20 border-t-navy rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted text-sm">분석 결과를 불러오는 중입니다...</p>
        <Link href={`/client/projects/${id}`} className="text-navy hover:underline text-sm mt-3 inline-block">
          프로젝트로 돌아가기
        </Link>
      </div>
    )
  }

  const vc = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG['CONDITIONAL GO']
  // 외부 패널(또는 혼합) 프로젝트만 고급 통계 분석 섹션 노출
  const isExternalPanel = panelSource === 'external' || panelSource === 'mixed'
  const n = result.summary.total_responses
  const satMean = result.summary.satisfaction_mean ?? 0
  const recMean = result.summary.recommend_mean ?? 0
  const recTop2Pct = result.summary.recommend_top2_ratio != null
    ? Math.round(result.summary.recommend_top2_ratio * 100)
    : null

  // 강점 / 약점 분리
  const strengths = result.item_analysis
    .filter((i) => i.is_strength || (i.ci_lower != null && i.ci_lower >= satThreshold))
    .filter((i) => !i.name.startsWith('KS_'))
    .sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0))
    .slice(0, 5)

  const weaknesses = result.item_analysis
    .filter((i) => i.is_weakness || (i.ci_lower != null && i.ci_lower < satThreshold && i.mean < satThreshold + 0.3))
    .filter((i) => !i.name.startsWith('KS_'))
    .sort((a, b) => (a.mean ?? 0) - (b.mean ?? 0))
    .slice(0, 5)

  const hasKS      = result.kill_signals.length > 0
  const hasCI      = strengths.some((s) => s.ci_lower != null)
  const hasDrivers = (result.key_drivers ?? []).length > 0
  const hasCohort  = result.cohort_analysis.length > 0
  const hasRdGuide = !!result.rd_guide
  const hasMarketing = !!result.marketing_guide
  const hasNextSteps = (result.next_steps ?? []).length > 0

  return (
    <div className="max-w-4xl mx-auto pb-16">

      {/* ── 네비게이션 ── */}
      <Link href={`/client/projects/${id}`} className="text-sm text-text-muted hover:text-text mb-4 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        프로젝트 상세
      </Link>

      {/* ── 보고서 헤더 ── */}
      <div className="mb-8">
        <p className="text-xs text-text-muted uppercase tracking-widest mb-1">관능 테스트 및 의사결정 진단 리포트</p>
        <h1 className="text-3xl font-bold text-text">{productName}</h1>
        <p className="text-sm text-text-muted mt-1">
          나들목 관능 평가 인증 시스템 · N={panelSize} · 4점 척도 시스템
        </p>
      </div>

      {/* ════════════════════════════════════════════════
          섹션 1 : 최종 판정
      ════════════════════════════════════════════════ */}
      <div className={`rounded-2xl border-2 ${vc.border} ${vc.lightBg} p-6 mb-6`}>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">최종 진단 결과</p>
        <div className="flex items-start gap-6">
          <TrafficLight active={vc.trafficLight} />
          <div className="flex-1">
            <p className={`text-4xl font-black tracking-tight ${vc.text}`}>{vc.label}</p>
            <p className="text-sm text-text mt-2 leading-relaxed">{vc.desc}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <div className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted mb-0.5">종합 만족도</p>
                <p className={`text-2xl font-black ${vc.text}`}>{satMean.toFixed(2)}</p>
                <p className="text-xs text-text-muted">/ 4점 만점</p>
              </div>
              {recTop2Pct != null ? (
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-xs text-text-muted mb-0.5">주변 추천 의향</p>
                  <p className={`text-2xl font-black ${vc.text}`}>{recTop2Pct}%</p>
                  <p className="text-xs text-text-muted">Top-2 Box</p>
                </div>
              ) : (
                <div className="bg-white/70 rounded-xl p-3 text-center">
                  <p className="text-xs text-text-muted mb-0.5">추천 의향</p>
                  <p className={`text-2xl font-black ${vc.text}`}>{recMean.toFixed(2)}</p>
                  <p className="text-xs text-text-muted">/ 4점 만점</p>
                </div>
              )}
              <div className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted mb-0.5">구매 의향</p>
                <p className={`text-2xl font-black ${vc.text}`}>{(result.summary.purchase_intent_mean ?? 0).toFixed(2)}</p>
                <p className="text-xs text-text-muted">/ 4점 만점</p>
              </div>
              <div className="bg-white/70 rounded-xl p-3 text-center">
                <p className="text-xs text-text-muted mb-0.5">출시 성공 확률</p>
                <p className={`text-2xl font-black ${vc.text}`}>{Math.round(result.success_probability)}%</p>
                <p className="text-xs text-text-muted">종합 모델</p>
              </div>
            </div>

            {/* 핵심 리스크 */}
            {result.max_penalty && (
              <div className="mt-4 flex flex-wrap gap-3">
                {result.core_usp && (
                  <div className="flex-1 min-w-0 bg-go-bg rounded-lg px-3 py-2">
                    <p className="text-xs text-go font-semibold mb-0.5">시장 진입 타당성</p>
                    <p className="text-sm text-text leading-snug">{result.core_usp}</p>
                  </div>
                )}
                <div className="flex-1 min-w-0 bg-nogo-bg rounded-lg px-3 py-2 border border-nogo/20">
                  <p className="text-xs text-nogo font-semibold mb-0.5">핵심 리스크</p>
                  <p className="text-sm text-text leading-snug">{result.max_penalty}</p>
                </div>
                {result.recommended_action && (
                  <div className="flex-1 min-w-0 bg-surface rounded-lg px-3 py-2 border border-border">
                    <p className="text-xs text-navy font-semibold mb-0.5">Next Step</p>
                    <p className="text-sm text-text leading-snug">{result.recommended_action}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ════════════════════════════════════════════════
          섹션 2 : Kill Signal 검증
      ════════════════════════════════════════════════ */}
      {hasKS && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="1단계 · Kill Signal 검증"
            title="치명적 결함 검증: 제형 충돌 리스크 점검"
            sub={`발생률 ${Math.round((result.kill_signals.find(k => k.level !== 'safe')?.ratio ?? 0) * 100)}% 이상 → Warning / ${Math.round(result.kill_signals.find(k => k.level === 'danger')?.ratio ?? 0.1 * 100)}% 초과 → Fail`}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted uppercase">항목</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">발생률</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">95% CI</th>
                  <th className="py-2.5 text-center text-xs font-semibold text-text-muted uppercase">판정</th>
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted uppercase pl-4">코멘트</th>
                </tr>
              </thead>
              <tbody>
                {result.kill_signals.map((ks) => (
                  <tr key={ks.name} className={`border-b border-border/50 last:border-0 ${
                    ks.level === 'danger'  ? 'bg-nogo-bg/50' :
                    ks.level === 'warning' ? 'bg-cgo-bg/50' : ''
                  }`}>
                    <td className="py-3 font-medium text-text">
                      {ks.level !== 'safe' && (
                        <span className="mr-2 text-base">{ks.level === 'danger' ? '🚨' : '⚠️'}</span>
                      )}
                      {ks.label || ks.name.replace('KS_', '')}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`font-bold text-base ${
                        ks.level === 'danger'  ? 'text-nogo' :
                        ks.level === 'warning' ? 'text-cgo'  : 'text-text'
                      }`}>
                        {((ks.ratio ?? 0) * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-center text-xs text-text-muted">
                      {ks.ci_lower != null && ks.ci_upper != null
                        ? `[${(ks.ci_lower*100).toFixed(1)}% ~ ${(ks.ci_upper*100).toFixed(1)}%]`
                        : '-'}
                    </td>
                    <td className="py-3 text-center"><KsBadge level={ks.level} /></td>
                    <td className="py-3 pl-4 text-text-muted text-xs leading-snug">
                      {ks.comment || (
                        ks.level === 'safe'    ? '허용 범위 내' :
                        ks.level === 'warning' ? '통과 기준 초과. 대규모 클레임 유발 위험.' :
                                                 '즉시 처방 수정 필요.'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 3 : 핵심 강점 CI 검증
      ════════════════════════════════════════════════ */}
      {strengths.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="2단계 · CI 검증"
            title="통계가 입증한 핵심 경쟁력"
            sub="최하한 신뢰구간(Lower bound)도 만족 임계점 이상 → 타겟 고객 전체가 확실하게 체감"
          />
          {hasCI ? (
            <CiDotChart
              items={strengths.map((s) => ({
                label: s.name,
                mean: s.mean,
                ci_lower: s.ci_lower!,
                ci_upper: s.ci_upper!,
              }))}
              threshold={satThreshold}
            />
          ) : (
            <div className="space-y-2">
              {strengths.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-1">
                  <span className="text-sm text-text flex-1">{s.name}</span>
                  <div className="w-40 h-4 bg-surface-dark rounded-full overflow-hidden">
                    <div className="h-full bg-go rounded-full" style={{ width: `${(s.mean / 4) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-go w-10 text-right">{(s.mean ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <Callout icon="💡" variant="success">
            최하한 신뢰구간(Lower bound)도 모두 {satThreshold.toFixed(1)}점 이상을 기록했습니다.
            이는 소수의 의견이 아닌, 타겟 고객 전체가 확실하게 체감하는 본 제품의 압도적 강점임을 증명합니다.
          </Callout>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 4 : 구조적 약점 CI 검증
      ════════════════════════════════════════════════ */}
      {weaknesses.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="2단계 · CI 검증 (계속)"
            title="구조적 한계 및 R&D 개선 과제"
            sub="하한선이 만족 임계점 미달 → 개인 취향 차이가 아닌, 제형 밸런스 붕괴로 인한 구조적 약점"
          />
          {hasCI ? (
            <CiDotChart
              items={weaknesses.map((s) => ({
                label: s.name,
                mean: s.mean,
                ci_lower: s.ci_lower!,
                ci_upper: s.ci_upper!,
              }))}
              threshold={satThreshold}
            />
          ) : (
            <div className="space-y-2">
              {weaknesses.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-1">
                  <span className="text-sm text-text flex-1">{s.name}</span>
                  <div className="w-40 h-4 bg-surface-dark rounded-full overflow-hidden">
                    <div className="h-full bg-cgo rounded-full" style={{ width: `${(s.mean / 4) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-cgo w-10 text-right">{(s.mean ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          <Callout icon="⚠" variant="warning">
            하한선이 {satThreshold.toFixed(1)}점 미만까지 하락하며 응답자 간 평가 편차가 매우 큽니다.
            단순한 개인 취향 차이가 아닌, 제형 밸런스 붕괴로 인한 구조적인 약점임을 통계적으로 의미합니다.
          </Callout>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 5 : 핵심 기여 요인 (Key Drivers) — 외부 패널 전용
      ════════════════════════════════════════════════ */}
      {isExternalPanel && hasDrivers && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="3단계 · 피어슨 상관관계 분석"
            title="종합 만족도를 결정짓는 핵심 기여 요인"
            sub="'무엇이 좋아 보이는가'가 아닌 '실제 구매를 움직이는가'를 발굴"
          />
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">Contribution Bar Graph</p>
              <div className="space-y-1">
                {(result.key_drivers ?? []).map((d) => (
                  <DriverBar key={d.label} label={d.label} r={d.pearson_r} rank={d.rank} />
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2">Pearson Correlation coefficient (r)</p>
            </div>
            <div className={`rounded-xl p-4 border ${vc.lightBg} ${vc.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚙️</span>
                <p className="text-sm font-bold text-text">R&D 전략적 가이드</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                고객의 최종 만족도는 상위 기여 요인에서 결정됩니다.<br />
                따라서 구조적 약점으로 지적된 항목을 개선하기 위한 처방 변경 시,
                핵심 기여 요인의 경쟁력을 절대 훼손하지 않아야 합니다.
              </p>
              {(result.key_drivers ?? []).slice(0, 2).map((d) => (
                <div key={d.label} className="mt-2 text-xs text-text-muted">
                  • <strong className="text-text">{d.label}</strong>이 1위 기여 요인
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 6 : 코호트 분석 — 외부 패널 전용
      ════════════════════════════════════════════════ */}
      {isExternalPanel && hasCohort && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="4단계 · 코호트별 심층 분석"
            title="타겟 세분화 및 타겟팅 확장성 검증"
            sub="전체 평균 뒤에 숨어 있는 특정 타겟층만의 동인 파악"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 text-left text-xs font-semibold text-text-muted">코호트</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">만족도</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">구매의향</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">추천의향</th>
                  <th className="py-2.5 text-right text-xs font-semibold text-text-muted">N</th>
                </tr>
              </thead>
              <tbody>
                {result.cohort_analysis.map((c) => {
                  const sat = c.satisfaction ?? null
                  const pur = c.purchase ?? null
                  const rec = c.recommend ?? null
                  const validSats = result.cohort_analysis.map(x => x.satisfaction ?? 0)
                  const isTop = sat !== null && sat === Math.max(...validSats)
                  return (
                    <tr key={c.skin_type} className="border-b border-border/50 last:border-0 hover:bg-surface/40 transition-colors">
                      <td className="py-2.5 font-medium text-text flex items-center gap-1.5">
                        {isTop && <span className="text-go text-xs">●</span>}
                        {c.skin_type}
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${(sat ?? 0) >= satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {sat !== null ? sat.toFixed(2) : '-'}
                      </td>
                      <td className={`py-2.5 text-right ${(pur ?? 0) >= satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {pur !== null ? pur.toFixed(2) : '-'}
                      </td>
                      <td className={`py-2.5 text-right ${(rec ?? 0) >= satThreshold ? 'text-go' : 'text-cgo'}`}>
                        {rec !== null ? rec.toFixed(2) : '-'}
                      </td>
                      <td className="py-2.5 text-right text-text-muted">{c.count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 연령대 T-test */}
          {result.age_cohort && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-sm font-semibold text-text mb-3">연령대별 타겟팅 확장성 검증 (Welch's T-test)</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center p-3 bg-surface rounded-xl">
                  <p className="text-xs text-text-muted">{result.age_cohort.group_a_label}</p>
                  <p className="text-2xl font-bold text-navy">{result.age_cohort.group_a_mean?.toFixed(2) ?? '-'}점</p>
                </div>
                <div className="text-center">
                  <div className={`text-2xl mb-1 ${result.age_cohort.is_significant ? '❌' : '✅'}`}>
                    {result.age_cohort.is_significant ? '⚡' : '✓'}
                  </div>
                  <p className="text-xs font-semibold text-text">
                    통계적 유의미한 차이 {result.age_cohort.is_significant ? '있음' : '없음'}
                  </p>
                  <p className="text-xs text-text-muted">(p-value = {result.age_cohort.p_value?.toFixed(3) ?? '-'})</p>
                </div>
                <div className="flex-1 text-center p-3 bg-surface rounded-xl">
                  <p className="text-xs text-text-muted">{result.age_cohort.group_b_label}</p>
                  <p className="text-2xl font-bold text-navy">{result.age_cohort.group_b_mean?.toFixed(2) ?? '-'}점</p>
                </div>
              </div>
              {result.age_cohort.insight && (
                <Callout icon="📢" variant="info">{result.age_cohort.insight}</Callout>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 7 : R&D 처방 수정 지침 — 외부 패널 전용
      ════════════════════════════════════════════════ */}
      {isExternalPanel && hasRdGuide && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="6단계 · 페널티 분석"
            title="R&D 및 제조사 즉각 처방 수정 지침"
            sub={result.rd_guide?.objective || '핵심 강점 유지, 구조적 약점 개선, Kill Signal 완벽 제거'}
          />
          <div className="grid md:grid-cols-2 gap-4">
            {/* DON'T */}
            <div className="rounded-xl border-2 border-nogo/30 bg-nogo-bg/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-nogo text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✕</span>
                <p className="font-bold text-nogo">[DON'T] 절대 지양 사항</p>
              </div>
              <ul className="space-y-2">
                {result.rd_guide!.dont.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="text-nogo mt-0.5 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* DO */}
            <div className="rounded-xl border-2 border-go/30 bg-go-bg/50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 rounded-full bg-go text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✓</span>
                <p className="font-bold text-go">[DO] 세부 요청 사항</p>
              </div>
              <ul className="space-y-2">
                {result.rd_guide!.do.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text">
                    <span className="text-go mt-0.5 flex-shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 8 : 마케팅 & 세일즈 커뮤니케이션 가이드
      ════════════════════════════════════════════════ */}
      {hasMarketing && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="마케팅 가이드"
            title="마케팅 및 세일즈 커뮤니케이션 기획 가이드"
          />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">👤</span>
                <p className="text-sm font-bold text-text">타겟팅 전략</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{result.marketing_guide!.targeting}</p>
            </div>
            <div className="bg-surface rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📱</span>
                <p className="text-sm font-bold text-text">매체 전략</p>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{result.marketing_guide!.channel}</p>
            </div>
            {result.marketing_guide!.message && (
              <div className="md:col-span-2 bg-navy/5 border border-navy/15 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">💬</span>
                  <p className="text-sm font-bold text-navy">핵심 카피 방향</p>
                </div>
                <p className="text-sm text-navy/80 leading-relaxed italic">"{result.marketing_guide!.message}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          섹션 9 : Next Steps 로드맵
      ════════════════════════════════════════════════ */}
      {hasNextSteps && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle
            step="9단계 · 종합 판정"
            title="향후 프로젝트 로드맵 (Next Steps)"
          />
          <div className="flex items-start gap-0 overflow-x-auto">
            {result.next_steps!.map((s, i) => (
              <div key={s.step} className="flex items-start flex-shrink-0">
                <div className="bg-surface border border-border rounded-xl p-4 w-52">
                  <div className="w-8 h-8 rounded-full bg-navy text-white text-sm font-bold flex items-center justify-center mb-2">
                    {s.step}
                  </div>
                  <p className="text-sm font-bold text-text mb-1">{s.title}</p>
                  <p className="text-xs text-text-muted leading-snug">{s.description}</p>
                </div>
                {i < result.next_steps!.length - 1 && (
                  <div className="flex items-center mt-8 flex-shrink-0">
                    <div className="w-8 h-px bg-navy/30" />
                    <svg className="w-3 h-3 text-navy/50" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7.293 4.707L13.586 11l-6.293 6.293 1.414 1.414L16.414 11 8.707 3.293z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 기본 결과 (Python 분석 결과가 없을 때 폴백) ── */}
      {!hasKS && !hasDrivers && !hasRdGuide && result.item_analysis.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
          <SectionTitle step="항목별 분석" title="문항별 평균 점수" />
          <div className="space-y-2">
            {result.item_analysis.filter((i) => !i.name.startsWith('KS_')).map((item) => (
              <div key={item.name} className="flex items-center gap-3 py-1">
                <span className="text-sm text-text flex-1">{item.name}</span>
                <div className="w-40 h-3 bg-surface-dark rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.mean >= 3.2 ? 'bg-go' : item.mean >= 2.8 ? 'bg-cgo' : 'bg-nogo'}`}
                    style={{ width: `${(item.mean / 4) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold w-10 text-right">{(item.mean ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 푸터 ── */}
      <div className="text-center text-xs text-text-muted mt-8 pt-6 border-t border-border">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="font-semibold text-navy">나들목(Nadlemok) 관능 평가 인증 시스템</span>
        </div>
        <p>본 리포트는 N={n}명의 관능 평가 데이터를 기반으로 자동 생성되었습니다.</p>
        <p>분석일: {new Date(result.analyzed_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
    </div>
  )
}
